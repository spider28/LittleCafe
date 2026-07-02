import { NextResponse } from "next/server";
import { cafe, menuSections, pricing } from "@/lib/content";
import { getChatThreadState, saveChatThreadState } from "@/lib/chat-thread-store";
import { runChatWorkflow } from "@/lib/chat-workflow";
import { getChatbotSettings } from "@/lib/data";
import { env } from "@/lib/env";
import { createTracedModelJsonFetch } from "@/lib/langsmith";
import { formatKnowledgeMatches, matchChatbotKnowledge } from "@/lib/rag";
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

function logRateLimitHeaders(provider: "openai" | "github", response: Pick<Response, "headers" | "status">) {
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

  const knowledgeMatches = latestUserMessage ? await matchChatbotKnowledge(latestUserMessage, settings.provider) : [];
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
    "If guests ask to book, change, or cancel a reservation, tell them this first version can answer questions and that staff can help through the Contact page or phone.",
    "Do not invent policies, availability, private events, allergens, or reservations."
  ].join(" ");

  if (settings.provider === "github") {
    if (!env.githubApiKey) {
      return NextResponse.json({ error: "GitHub Models is not configured yet. Add GITHUB_API_KEY to .env.local." }, { status: 503 });
    }

    const fetchGithubChat = createTracedModelJsonFetch<ChatCompletionResponse>({
      name: "GitHub Models Chat Completion",
      provider: "github",
      model: env.githubModel
    });
    const response = await fetchGithubChat(env.githubEndPoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.githubApiKey}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.githubModel,
        messages: [
          {
            role: "system",
            content: `${instructions}\n\n${context}`
          },
          ...recentMessages.map((message) => ({
            role: message.role,
            content: message.content
          }))
        ],
        max_tokens: 350
      })
    });
    logRateLimitHeaders("github", response);

    const data = response.data;

    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message ?? "The chatbot could not answer right now." }, { status: response.status });
    }

    const reply = extractChatCompletionText(data);
    if (!reply) {
      return NextResponse.json({ error: "The chatbot returned an empty answer." }, { status: 502 });
    }

    return NextResponse.json({ reply });
  }

  if (!env.openaiApiKey) {
    return NextResponse.json({ error: "OpenAI is not configured yet. Add OPENAI_API_KEY to .env.local." }, { status: 503 });
  }

  const fetchOpenAIResponse = createTracedModelJsonFetch<OpenAIResponse>({
    name: "OpenAI Responses",
    provider: "openai",
    model: env.openaiModel
  });
  const response = await fetchOpenAIResponse(env.openaiEndPoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.openaiModel,
      instructions,
      input: [
        {
          role: "developer",
          content: context
        },
        ...recentMessages.map((message) => ({
          role: message.role,
          content: message.content
        }))
      ],
      max_output_tokens: 350
    })
  });
  logRateLimitHeaders("openai", response);

  const data = response.data;

  if (!response.ok) {
    return NextResponse.json({ error: data.error?.message ?? "The chatbot could not answer right now." }, { status: response.status });
  }

  const reply = extractText(data);
  if (!reply) {
    return NextResponse.json({ error: "The chatbot returned an empty answer." }, { status: 502 });
  }

  return NextResponse.json({ reply });
}
