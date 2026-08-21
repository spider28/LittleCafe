import { createSupabaseServerClient } from "./supabase";
import { getChatbotProviderConfig, knowledgeEmbeddingDimensions } from "./chat-providers";
import { createTracedModelJsonFetch, createUsageMetadata } from "./langsmith";
import type { ChatbotProvider } from "./chat-providers";

export type ChatbotKnowledgeMatch = {
  id: string;
  title: string;
  content: string;
  source: string;
  similarity: number;
};

type EmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>;
  usage?: {
    prompt_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string };
};

export type ChatbotEmbedding = {
  embedding: number[];
  provider: ChatbotProvider;
  model: string;
};

const matchCount = 5;

export type ChatbotKnowledgeRetrieval = {
  matches: ChatbotKnowledgeMatch[];
  succeeded: boolean;
};

/**
 * Matryoshka models (Gemini) put the strongest signal in the leading dimensions, so
 * truncating a longer vector is the documented way to reach a smaller width. This is a
 * safety net for providers that ignore the `dimensions` request field; a vector that is
 * too short cannot be repaired and is a configuration error.
 */
export function fitEmbeddingWidth(embedding: number[], label: string) {
  if (embedding.length === knowledgeEmbeddingDimensions) {
    return embedding;
  }

  if (embedding.length > knowledgeEmbeddingDimensions) {
    return embedding.slice(0, knowledgeEmbeddingDimensions);
  }

  throw new Error(
    `${label} returned ${embedding.length}-dimension embeddings, but chatbot knowledge stores ${knowledgeEmbeddingDimensions}. Pick an embedding model that supports ${knowledgeEmbeddingDimensions} dimensions.`
  );
}

export async function createEmbedding(input: string, provider: ChatbotProvider): Promise<ChatbotEmbedding> {
  const config = getChatbotProviderConfig(provider);

  if (!config.apiKey) {
    throw new Error(`${config.label} embeddings are not configured yet. Add ${config.apiKeyEnvName} to .env.local.`);
  }

  const fetchEmbedding = createTracedModelJsonFetch<EmbeddingResponse>({
    name: `${config.label} Embeddings`,
    provider: config.provider,
    model: config.embeddingModel,
    modelType: "llm",
    processOutputs: (outputs) => ({
      status: outputs.status,
      ok: outputs.ok,
      embedding_count: outputs.data.data?.length ?? 0,
      embedding_dimensions: outputs.data.data?.[0]?.embedding?.length ?? 0,
      usage_metadata: createUsageMetadata(outputs.data.usage)
    })
  });
  const response = await fetchEmbedding(config.embeddingEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      ...config.extraHeaders,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.embeddingModel,
      input,
      ...(config.embeddingDimensions ? { dimensions: config.embeddingDimensions } : {})
    })
  });

  const data = response.data;
  if (!response.ok) {
    throw new Error(data.error?.message ?? "Embedding generation failed.");
  }

  const embedding = data.data?.[0]?.embedding;
  if (!embedding?.length) {
    throw new Error("Embedding generation returned an empty vector.");
  }

  return {
    embedding: fitEmbeddingWidth(embedding, config.label),
    provider: config.provider,
    model: config.embeddingModel
  };
}

export async function retrieveChatbotKnowledge(query: string, provider: ChatbotProvider): Promise<ChatbotKnowledgeRetrieval> {
  const config = getChatbotProviderConfig(provider);
  if (!config.apiKey) {
    return { matches: [], succeeded: false };
  }

  try {
    const { embedding } = await createEmbedding(query, provider);
    const supabase = await createSupabaseServerClient();
    // Embeddings from different providers are not comparable, so only chunks embedded by
    // the active provider are searched, at that model's own relevance threshold.
    const { data, error } = await supabase.rpc("match_chatbot_knowledge", {
      query_embedding: embedding,
      match_threshold: config.matchThreshold,
      match_count: matchCount,
      provider_filter: provider
    });

    if (error) {
      console.error("[chat:rag] semantic search failed", error.message);
      return { matches: [], succeeded: false };
    }

    return { matches: (data ?? []) as ChatbotKnowledgeMatch[], succeeded: true };
  } catch (error) {
    console.error("[chat:rag] retrieval skipped", error instanceof Error ? error.message : error);
    return { matches: [], succeeded: false };
  }
}

export async function matchChatbotKnowledge(query: string, provider: ChatbotProvider): Promise<ChatbotKnowledgeMatch[]> {
  return (await retrieveChatbotKnowledge(query, provider)).matches;
}

export function formatKnowledgeMatches(matches: ChatbotKnowledgeMatch[]) {
  return matches
    .map((match, index) => {
      return [`Knowledge ${index + 1}: ${match.title}`, `Source: ${match.source}`, match.content].join("\n");
    })
    .join("\n\n");
}
