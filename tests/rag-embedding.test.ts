import { describe, expect, it } from "vitest";
import { fitEmbeddingWidth } from "@/lib/rag";
import { knowledgeEmbeddingDimensions } from "@/lib/chat-providers";

function vectorOfLength(length: number) {
  return Array.from({ length }, (_, index) => index / length);
}

describe("embedding width", () => {
  it("passes a correctly sized vector through untouched", () => {
    const embedding = vectorOfLength(knowledgeEmbeddingDimensions);
    expect(fitEmbeddingWidth(embedding, "Google Gemini")).toBe(embedding);
  });

  it("truncates a wider vector to the stored width", () => {
    // Gemini defaults to 3072 dimensions. Matryoshka models keep the strongest signal in the
    // leading dimensions, so taking the first N is the documented way to shrink one.
    const embedding = vectorOfLength(3072);
    const fitted = fitEmbeddingWidth(embedding, "Google Gemini");

    expect(fitted).toHaveLength(knowledgeEmbeddingDimensions);
    expect(fitted).toEqual(embedding.slice(0, knowledgeEmbeddingDimensions));
  });

  it("rejects a vector that is too short to store", () => {
    // A 768-wide model cannot be padded into the column without corrupting similarity.
    expect(() => fitEmbeddingWidth(vectorOfLength(768), "Ollama")).toThrowError(/768-dimension/);
    expect(() => fitEmbeddingWidth(vectorOfLength(768), "Ollama")).toThrowError(/Ollama/);
  });

  it("names the required width in the error so the fix is obvious", () => {
    expect(() => fitEmbeddingWidth([0.1, 0.2], "Test Provider")).toThrowError(
      new RegExp(String(knowledgeEmbeddingDimensions))
    );
  });
});
