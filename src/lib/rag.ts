import { createSupabaseServerClient } from "./supabase";
import { env } from "./env";
import type { ChatbotProvider } from "./data";

export type ChatbotKnowledgeMatch = {
  id: string;
  title: string;
  content: string;
  source: string;
  similarity: number;
};

type EmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>;
  error?: { message?: string };
};

const matchThreshold = 0.72;
const matchCount = 5;

export async function createEmbedding(input: string, provider: ChatbotProvider) {
  const isGitHub = provider === "github";
  const apiKey = isGitHub ? env.githubApiKey : env.openaiApiKey;
  const endpoint = isGitHub ? env.githubEmbeddingEndPoint : env.openaiEmbeddingEndPoint;
  const model = isGitHub ? env.githubEmbeddingModel : env.openaiEmbeddingModel;
  const providerName = isGitHub ? "GitHub Models" : "OpenAI";

  if (!apiKey) {
    throw new Error(`${providerName} embeddings are not configured yet. Add ${isGitHub ? "GITHUB_API_KEY" : "OPENAI_API_KEY"} to .env.local.`);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(isGitHub
        ? {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
          }
        : {}),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input
    })
  });

  const data = (await response.json().catch(() => ({}))) as EmbeddingResponse;
  if (!response.ok) {
    throw new Error(data.error?.message ?? "Embedding generation failed.");
  }

  const embedding = data.data?.[0]?.embedding;
  if (!embedding?.length) {
    throw new Error("Embedding generation returned an empty vector.");
  }

  return embedding;
}

export async function matchChatbotKnowledge(query: string, provider: ChatbotProvider): Promise<ChatbotKnowledgeMatch[]> {
  if (provider === "github" ? !env.githubApiKey : !env.openaiApiKey) {
    return [];
  }

  try {
    const queryEmbedding = await createEmbedding(query, provider);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("match_chatbot_knowledge", {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount
    });

    if (error) {
      console.error("[chat:rag] semantic search failed", error.message);
      return [];
    }

    return (data ?? []) as ChatbotKnowledgeMatch[];
  } catch (error) {
    console.error("[chat:rag] retrieval skipped", error instanceof Error ? error.message : error);
    return [];
  }
}

export function formatKnowledgeMatches(matches: ChatbotKnowledgeMatch[]) {
  return matches
    .map((match, index) => {
      return [`Knowledge ${index + 1}: ${match.title}`, `Source: ${match.source}`, match.content].join("\n");
    })
    .join("\n\n");
}
