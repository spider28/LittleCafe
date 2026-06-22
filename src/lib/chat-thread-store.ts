import { createSupabaseAdminClient } from "./supabase";
import type { WorkflowStateSnapshot } from "./chat-workflow";

const defaultState: WorkflowStateSnapshot = {};

export async function getChatThreadState(sessionId: string): Promise<WorkflowStateSnapshot> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return defaultState;
  }

  const { data, error } = await supabase.from("chatbot_threads").select("state").eq("session_id", sessionId).maybeSingle();
  if (error || !data?.state || typeof data.state !== "object") {
    return defaultState;
  }

  return data.state as WorkflowStateSnapshot;
}

export async function saveChatThreadState(sessionId: string, state: WorkflowStateSnapshot) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  await supabase.from("chatbot_threads").upsert({
    session_id: sessionId,
    state,
    updated_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString()
  });
}
