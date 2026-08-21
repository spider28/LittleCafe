import { env } from "./env";

export type ChatbotProvider = "openai" | "github" | "gemini";

/**
 * "responses" is the OpenAI Responses API shape (instructions + input).
 * "chat-completions" is the OpenAI chat-completions shape that GitHub Models and
 * the Gemini OpenAI-compatible endpoint both speak (messages + max_tokens).
 */
export type ChatbotApiShape = "responses" | "chat-completions";

export type ChatbotProviderConfig = {
  provider: ChatbotProvider;
  label: string;
  apiKeyEnvName: string;
  apiKey: string;
  api: ChatbotApiShape;
  chatEndpoint: string;
  chatModel: string;
  embeddingEndpoint: string;
  embeddingModel: string;
  /** Sent as the `dimensions` request field when the provider needs to be told the size. */
  embeddingDimensions: number | null;
  /**
   * Sent as `reasoning_effort` on chat-completions requests. Gemini 3 Flash spends internal
   * thinking tokens out of the same budget as `max_tokens`; a ~350 token cap is enough for a
   * cafe answer but not for thinking plus an answer, which truncates the reply or empties it.
   */
  reasoningEffort: string | null;
  /**
   * Minimum cosine similarity for a knowledge chunk to count as relevant. This belongs to the
   * embedding model, not the app: different models spread their scores differently, so one
   * shared number cannot serve both.
   */
  matchThreshold: number;
  extraHeaders: Record<string, string>;
  /** Set when the provider is no longer usable, so Admin can say so instead of failing silently. */
  retiredNote: string | null;
};

/** The width of `chatbot_knowledge_chunks.embedding`; pgvector caps HNSW indexes at 2000. */
export const knowledgeEmbeddingDimensions = 1536;

/** Selectable in Admin, in the order they are shown. */
export const chatbotProviders: ChatbotProvider[] = ["gemini", "openai", "github"];

export function isChatbotProvider(value: unknown): value is ChatbotProvider {
  return typeof value === "string" && (chatbotProviders as string[]).includes(value);
}

export function getChatbotProviderConfig(provider: ChatbotProvider): ChatbotProviderConfig {
  if (provider === "gemini") {
    return {
      provider,
      label: "Google Gemini",
      apiKeyEnvName: "GEMINI_API_KEY",
      apiKey: env.geminiApiKey,
      api: "chat-completions",
      chatEndpoint: env.geminiEndPoint,
      chatModel: env.geminiModel,
      embeddingEndpoint: env.geminiEmbeddingEndPoint,
      embeddingModel: env.geminiEmbeddingModel,
      // Gemini embeddings default to 3072; ask for the width the knowledge store uses.
      embeddingDimensions: knowledgeEmbeddingDimensions,
      reasoningEffort: env.geminiReasoningEffort,
      // Measured against gemini-embedding-001 at 1536 dimensions: paraphrases of a stored chunk
      // score 0.62-0.70 and unrelated cafe questions score 0.48-0.58. OpenAI's 0.72 sits above
      // every real match here, so retrieval would never return anything.
      matchThreshold: 0.6,
      extraHeaders: {},
      retiredNote: null
    };
  }

  if (provider === "github") {
    return {
      provider,
      label: "GitHub Models",
      apiKeyEnvName: "GITHUB_TOKEN",
      apiKey: env.githubToken,
      api: "chat-completions",
      chatEndpoint: env.githubEndPoint,
      chatModel: env.githubModel,
      embeddingEndpoint: env.githubEmbeddingEndPoint,
      embeddingModel: env.githubEmbeddingModel,
      embeddingDimensions: null,
      reasoningEffort: null,
      matchThreshold: 0.72,
      extraHeaders: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      retiredNote: "GitHub Models was retired on July 30, 2026 and no longer answers requests."
    };
  }

  return {
    provider: "openai",
    label: "OpenAI",
    apiKeyEnvName: "OPENAI_API_KEY",
    apiKey: env.openaiApiKey,
    api: "responses",
    chatEndpoint: env.openaiEndPoint,
    chatModel: env.openaiModel,
    embeddingEndpoint: env.openaiEmbeddingEndPoint,
    embeddingModel: env.openaiEmbeddingModel,
    // text-embedding-3-small is natively 1536.
    embeddingDimensions: null,
    reasoningEffort: null,
    matchThreshold: 0.72,
    extraHeaders: {},
    retiredNote: null
  };
}
