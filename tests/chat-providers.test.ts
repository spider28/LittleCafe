import { describe, expect, it } from "vitest";
import {
  chatbotProviders,
  getChatbotProviderConfig,
  isChatbotProvider,
  knowledgeEmbeddingDimensions
} from "@/lib/chat-providers";

describe("chatbot providers", () => {
  it("accepts every selectable provider and rejects anything else", () => {
    for (const provider of chatbotProviders) {
      expect(isChatbotProvider(provider)).toBe(true);
    }

    expect(isChatbotProvider("anthropic")).toBe(false);
    expect(isChatbotProvider("")).toBe(false);
    expect(isChatbotProvider(undefined)).toBe(false);
    expect(isChatbotProvider(null)).toBe(false);
    expect(isChatbotProvider(7)).toBe(false);
  });

  it("defaults to OpenAI for an unrecognized provider", () => {
    // The provider arrives from a database column, so the config resolver must not
    // return a partially-populated object for an unexpected value.
    const config = getChatbotProviderConfig("mystery" as never);
    expect(config.provider).toBe("openai");
    expect(config.api).toBe("responses");
  });

  it("asks Gemini for the width the knowledge store uses", () => {
    const gemini = getChatbotProviderConfig("gemini");
    expect(gemini.embeddingDimensions).toBe(knowledgeEmbeddingDimensions);
    expect(gemini.api).toBe("chat-completions");
  });

  it("does not send a dimensions field for natively 1536-wide providers", () => {
    expect(getChatbotProviderConfig("openai").embeddingDimensions).toBeNull();
    expect(getChatbotProviderConfig("github").embeddingDimensions).toBeNull();
  });

  it("suppresses Gemini thinking tokens so replies fit the token cap", () => {
    // Gemini 3 Flash spends thinking tokens out of the same budget as max_tokens; leaving
    // this unset truncated replies at 350 tokens and emptied them at smaller caps.
    expect(getChatbotProviderConfig("gemini").reasoningEffort).toBe("none");
    expect(getChatbotProviderConfig("openai").reasoningEffort).toBeNull();
    expect(getChatbotProviderConfig("github").reasoningEffort).toBeNull();
  });

  it("uses a relevance threshold suited to each embedding model", () => {
    // Measured against gemini-embedding-001: paraphrases of a stored chunk land at 0.62-0.70
    // while unrelated cafe questions land at 0.48-0.58. OpenAI's 0.72 excluded every real
    // match, so a shared threshold silently disabled retrieval.
    const gemini = getChatbotProviderConfig("gemini");
    expect(gemini.matchThreshold).toBeLessThan(0.62);
    expect(gemini.matchThreshold).toBeGreaterThan(0.5835);
    expect(getChatbotProviderConfig("openai").matchThreshold).toBe(0.72);
  });

  it("marks GitHub Models as retired and leaves live providers unmarked", () => {
    expect(getChatbotProviderConfig("github").retiredNote).toContain("retired");
    expect(getChatbotProviderConfig("gemini").retiredNote).toBeNull();
    expect(getChatbotProviderConfig("openai").retiredNote).toBeNull();
  });

  it("names the environment variable each provider needs", () => {
    expect(getChatbotProviderConfig("gemini").apiKeyEnvName).toBe("GEMINI_API_KEY");
    expect(getChatbotProviderConfig("openai").apiKeyEnvName).toBe("OPENAI_API_KEY");
    expect(getChatbotProviderConfig("github").apiKeyEnvName).toBe("GITHUB_TOKEN");
  });
});
