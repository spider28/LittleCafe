import { describe, expect, it } from "vitest";
import { cafe } from "@/lib/content";
import { chatbotKnowledgeSchema, contactSchema, galleryUploadSchema, reservationSchema, waiverSchema } from "@/lib/schemas";

describe("form schemas", () => {
  it("accepts a valid contact message", () => {
    expect(
      contactSchema.safeParse({
        fullName: "Ada Lovelace",
        email: "ada@example.com",
        phone: "5551234567",
        message: "I would like to plan a small gathering."
      }).success
    ).toBe(true);
  });

  it("requires every waiver agreement", () => {
    expect(
      waiverSchema.safeParse({
        fullName: "Grace Hopper",
        phone: "5551234567",
        email: "",
        agreements: cafe.agreements.slice(0, 1),
        signature: "Grace Hopper"
      }).success
    ).toBe(false);
  });

  it("rejects reservations that end before they start", () => {
    expect(
      reservationSchema.safeParse({
        title: "Table block",
        partySize: 4,
        startsAt: "2026-06-10T12:00",
        endsAt: "2026-06-10T11:00",
        status: "reserved"
      }).success
    ).toBe(false);
  });

  it("accepts gallery upload metadata", () => {
    expect(
      galleryUploadSchema.safeParse({
        altText: "A sunny cafe table",
        displayOrder: "2"
      }).success
    ).toBe(true);
  });

  it("accepts chatbot knowledge chunks", () => {
    expect(
      chatbotKnowledgeSchema.safeParse({
        title: "Waiver policy",
        source: "FAQ",
        content: "Guests should complete the waiver before attending private events.",
        active: true
      }).success
    ).toBe(true);
  });
});
