import { createBrowserClient } from "@supabase/ssr";
import { env } from "./env";

const missingUrl = "https://example.supabase.co";
const missingKey = "missing-key";

export function createSupabaseBrowserClient() {
  return createBrowserClient(env.supabaseUrl || missingUrl, env.supabaseAnonKey || missingKey);
}
