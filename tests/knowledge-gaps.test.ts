import { describe, expect, it } from "vitest";
import { isKnowledgeGapCandidate } from "@/lib/knowledge-gaps";

describe("chatbot knowledge gaps", () => {
  it("captures question-like requests", () => {
    expect(isKnowledgeGapCandidate("Do you offer gluten-free birthday cakes?")).toBe(true);
    expect(isKnowledgeGapCandidate("Tell me whether outside decorations are allowed")).toBe(true);
    expect(isKnowledgeGapCandidate("Where can I park?")).toBe(true);
  });

  it("ignores greetings and conversational statements", () => {
    expect(isKnowledgeGapCandidate("Hello!")).toBe(false);
    expect(isKnowledgeGapCandidate("Thank you")).toBe(false);
    expect(isKnowledgeGapCandidate("I like this cafe")).toBe(false);
  });

  it("rejects empty and oversized input", () => {
    expect(isKnowledgeGapCandidate("Why?")).toBe(false);
    expect(isKnowledgeGapCandidate(`What ${"x".repeat(1200)}?`)).toBe(false);
  });
});
