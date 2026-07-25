import { createSupabaseAdminClient } from "./supabase";

const questionPattern =
  /(?:\?|^(?:what|when|where|which|who|why|how|can|could|do|does|did|is|are|will|would|should|may|tell me|please tell me|i want to know)\b)/i;
const greetingOnlyPattern = /^(?:hi|hello|hey|good (?:morning|afternoon|evening)|thanks?|thank you)[!. ]*$/i;

export function isKnowledgeGapCandidate(message: string) {
  const normalized = message.trim().replace(/\s+/g, " ");
  return normalized.length >= 6 && normalized.length <= 1200 && !greetingOnlyPattern.test(normalized) && questionPattern.test(normalized);
}

export async function captureChatbotKnowledgeGap(question: string, suggestedAnswer: string) {
  if (!isKnowledgeGapCandidate(question)) {
    return false;
  }

  try {
    const supabase = createSupabaseAdminClient();
    if (!supabase) {
      console.error("[chat:rag] knowledge gap capture requires SUPABASE_SERVICE_ROLE_KEY");
      return false;
    }

    const { error } = await supabase.rpc("capture_chatbot_knowledge_gap", {
      question_input: question,
      suggested_answer_input: suggestedAnswer
    });

    if (error) {
      console.error("[chat:rag] knowledge gap could not be captured", error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[chat:rag] knowledge gap capture skipped", error instanceof Error ? error.message : error);
    return false;
  }
}
