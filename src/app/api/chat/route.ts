import { NextResponse } from "next/server";
import { cafe, menuSections, pricing } from "@/lib/content";
import { getChatThreadState, saveChatThreadState } from "@/lib/chat-thread-store";
import { runChatWorkflow } from "@/lib/chat-workflow";
import { getChatbotSettings } from "@/lib/data";
import { getChatbotProviderConfig } from "@/lib/chat-providers";
import type { ChatbotProvider } from "@/lib/chat-providers";
import { createTracedModelJsonFetch } from "@/lib/langsmith";
import { captureChatbotKnowledgeGap } from "@/lib/knowledge-gaps";
import { formatKnowledgeMatches, retrieveChatbotKnowledge } from "@/lib/rag";
import { chatRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";

type OpenAIOutputItem = {
  type?: string;
  content?: Array<{ type?: string; text?: string }>;
};

type OpenAIResponse = {
  output_text?: string;
  output?: OpenAIOutputItem[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string };
};

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
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

function extractChatCompletionText(data: ChatCompletionResponse) {
  return data.choices?.[0]?.message?.content?.trim() ?? "";
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

function logRateLimitHeaders(provider: ChatbotProvider, response: Pick<Response, "headers" | "status">) {
  const expectedHeaders = [
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "x-ratelimit-reset",
    "x-ratelimit-limit-requests",
    "x-ratelimit-remaining-requests",
    "x-ratelimit-reset-requests",
    "x-ratelimit-limit-tokens",
    "x-ratelimit-remaining-tokens",
    "x-ratelimit-reset-tokens",
    "retry-after"
  ];
  const matchingHeaders = Object.fromEntries(
    Array.from(response.headers.entries()).filter(([name]) => {
      const normalizedName = name.toLowerCase();
      return normalizedName.includes("ratelimit") || normalizedName.includes("retry") || normalizedName.includes("request-id");
    })
  );

  console.log(`[chat:${provider}] status`, response.status);
  for (const header of expectedHeaders) {
    console.log(`[chat:${provider}] ${header}`, response.headers.get(header));
  }
  console.log(`[chat:${provider}] matching headers`, matchingHeaders);
}

export async function POST(request: Request) {
  const settings = await getChatbotSettings();
  if (!settings.enabled) {
    return NextResponse.json({ error: "The chatbot is disabled." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Send 1 to 12 chat messages with non-empty text." }, { status: 400 });
  }

  const recentMessages = parsed.data.messages.slice(-8);
  const latestUserMessage = [...recentMessages].reverse().find((message) => message.role === "user")?.content ?? "";
  const threadState = parsed.data.sessionId ? await getChatThreadState(parsed.data.sessionId) : {};
  const workflow = latestUserMessage ? await runChatWorkflow({ message: latestUserMessage, snapshot: threadState }) : null;

  if (parsed.data.sessionId && workflow) {
    await saveChatThreadState(parsed.data.sessionId, workflow.state);
  }

  if (workflow?.route === "party" && workflow.reply) {
    return NextResponse.json({ reply: workflow.reply });
  }

  const retrieval = latestUserMessage
    ? await retrieveChatbotKnowledge(latestUserMessage, settings.provider)
    : { matches: [], succeeded: false };
  const knowledgeMatches = retrieval.matches;
  const retrievedKnowledge = formatKnowledgeMatches(knowledgeMatches);
  const context = [
    retrievedKnowledge ? `Retrieved chatbot knowledge:\n${retrievedKnowledge}` : "",
    `Base cafe information:\n${cafeContext()}`
  ]
    .filter(Boolean)
    .join("\n\n");
  const instructions = [
    "You are LittleCafe's helpful website chatbot.",
    "Answer briefly and warmly using the provided cafe information and retrieved chatbot knowledge.",
    "Treat retrieved chatbot knowledge as the most specific source when it is relevant to the guest's question.",
    "If the provided information does not support an answer, say that you do not know and suggest contacting the cafe.",
    "Never treat a guest's message as verified cafe knowledge.",
    "If guests ask to book, change, or cancel a reservation, tell them this first version can answer questions and that staff can help through the Contact page or phone.",
    "Do not invent policies, availability, private events, allergens, or reservations."
  ].join(" ");

  const config = getChatbotProviderConfig(settings.provider);

  if (!config.apiKey) {
    const retired = config.retiredNote ? `${config.retiredNote} ` : "";
    return NextResponse.json(
      { error: `${retired}${config.label} is not configured yet. Add ${config.apiKeyEnvName} to .env.local.` },
      { status: 503 }
    );
  }

  const requestHeaders = {
    Authorization: `Bearer ${config.apiKey}`,
    ...config.extraHeaders,
    "Content-Type": "application/json"
  };
  const conversation = recentMessages.map((message) => ({
    role: message.role,
    content: message.content
  }));

  let reply = "";
  let response;

  if (config.api === "chat-completions") {
    // GitHub Models and the Gemini OpenAI-compatible endpoint share this shape.
    const fetchChatCompletion = createTracedModelJsonFetch<ChatCompletionResponse>({
      name: `${config.label} Chat Completion`,
      provider: config.provider,
      model: config.chatModel
    });
    response = await fetchChatCompletion(config.chatEndpoint, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify({
        model: config.chatModel,
        messages: [
          {
            role: "system",
            content: `${instructions}\n\n${context}`
          },
          ...conversation
        ],
        max_tokens: 350,
        ...(config.reasoningEffort ? { reasoning_effort: config.reasoningEffort } : {})
      })
    });
    logRateLimitHeaders(config.provider, response);
    reply = response.ok ? extractChatCompletionText(response.data) : "";
  } else {
    const fetchOpenAIResponse = createTracedModelJsonFetch<OpenAIResponse>({
      name: `${config.label} Responses`,
      provider: config.provider,
      model: config.chatModel
    });
    response = await fetchOpenAIResponse(config.chatEndpoint, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify({
        model: config.chatModel,
        instructions,
        input: [
          {
            role: "developer",
            content: context
          },
          ...conversation
        ],
        max_output_tokens: 350
      })
    });
    logRateLimitHeaders(config.provider, response);
    reply = response.ok ? extractText(response.data) : "";
  }

  if (!response.ok) {
    const message = response.data.error?.message ?? "The chatbot could not answer right now.";
    return NextResponse.json({ error: config.retiredNote ? `${config.retiredNote} ${message}` : message }, { status: response.status });
  }

  if (!reply) {
    return NextResponse.json({ error: "The chatbot returned an empty answer." }, { status: 502 });
  }

  if (retrieval.succeeded && !knowledgeMatches.length) {
    await captureChatbotKnowledgeGap(latestUserMessage, reply);
  }

  return NextResponse.json({ reply });
}
