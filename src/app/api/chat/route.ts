import { NextResponse } from "next/server";
import { cafe, menuSections, pricing } from "@/lib/content";
import { env } from "@/lib/env";
import { chatRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";

type OpenAIOutputItem = {
  type?: string;
  content?: Array<{ type?: string; text?: string }>;
};

type OpenAIResponse = {
  output_text?: string;
  output?: OpenAIOutputItem[];
  error?: { message?: string };
};

function extractText(data: OpenAIResponse) {
  if (data.output_text) {
    return data.output_text;
  }

  return (
    data.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter(Boolean)
      .join("\n")
      .trim() || ""
  );
}

function cafeContext() {
  const hours = cafe.hours.map((item) => `${item.day}: ${item.value}`).join("; ");
  const menu = menuSections
    .map((section) => `${section.title}: ${section.items.map((item) => `${item.name} (${item.price})`).join(", ")}`)
    .join("; ");
  const packages = pricing.map((item) => `${item.title}: ${item.price} - ${item.details}`).join("; ");

  return [
    `${cafe.name} is a neighborhood cafe.`,
    `Tagline: ${cafe.tagline}`,
    `Address: ${cafe.address}`,
    `Phone: ${cafe.phone}`,
    `Email: ${cafe.email}`,
    `Hours: ${hours}`,
    `Menu highlights: ${menu}`,
    `Event and group options: ${packages}`
  ].join("\n");
}

export async function POST(request: Request) {
  if (!env.openaiApiKey) {
    return NextResponse.json({ error: "OpenAI is not configured yet. Add OPENAI_API_KEY to .env.local." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Send 1 to 12 chat messages with non-empty text." }, { status: 400 });
  }

  const recentMessages = parsed.data.messages.slice(-8);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.openaiModel,
      instructions: [
        "You are LittleCafe's helpful website chatbot.",
        "Answer briefly and warmly using the provided cafe information.",
        "If guests ask to book, change, or cancel a reservation, tell them this first version can answer questions and that staff can help through the Contact page or phone.",
        "Do not invent policies, availability, private events, allergens, or reservations."
      ].join(" "),
      input: [
        {
          role: "developer",
          content: cafeContext()
        },
        ...recentMessages.map((message) => ({
          role: message.role,
          content: message.content
        }))
      ],
      max_output_tokens: 350
    })
  });

  const data = (await response.json().catch(() => ({}))) as OpenAIResponse;

  if (!response.ok) {
    return NextResponse.json({ error: data.error?.message ?? "The chatbot could not answer right now." }, { status: response.status });
  }

  const reply = extractText(data);
  if (!reply) {
    return NextResponse.json({ error: "The chatbot returned an empty answer." }, { status: 502 });
  }

  return NextResponse.json({ reply });
}
