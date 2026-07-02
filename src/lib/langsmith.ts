import { traceable } from "langsmith/traceable";

type TokenUsage = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
};

type UsageMetadata = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
};

export type TracedJsonResponse<T> = {
  ok: boolean;
  status: number;
  headers: Headers;
  data: T;
};

export function createUsageMetadata(usage?: TokenUsage): UsageMetadata | undefined {
  if (!usage) {
    return undefined;
  }

  const inputTokens = usage.input_tokens ?? usage.prompt_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? usage.completion_tokens ?? 0;
  const totalTokens = usage.total_tokens ?? inputTokens + outputTokens;

  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens
  };
}

export async function fetchJson<T>(url: string, init: RequestInit): Promise<TracedJsonResponse<T>> {
  const response = await fetch(url, init);
  const data = (await response.json().catch(() => ({}))) as T;

  return {
    ok: response.ok,
    status: response.status,
    headers: response.headers,
    data
  };
}

export function createTracedModelJsonFetch<T>(config: {
  name: string;
  provider: string;
  model: string;
  modelType?: "chat" | "llm";
  processOutputs?: (outputs: Readonly<TracedJsonResponse<T>>) => Record<string, unknown>;
}) {
  return traceable(fetchJson<T>, {
    name: config.name,
    run_type: "llm",
    getInvocationParams: () => ({
      ls_provider: config.provider,
      ls_model_type: config.modelType ?? "chat",
      ls_model_name: config.model
    }),
    processInputs: () => ({
      provider: config.provider,
      model: config.model
    }),
    processOutputs:
      config.processOutputs ??
      ((outputs) => ({
        status: outputs.status,
        ok: outputs.ok,
        usage_metadata: createUsageMetadata((outputs.data as { usage?: TokenUsage }).usage)
      }))
  });
}
