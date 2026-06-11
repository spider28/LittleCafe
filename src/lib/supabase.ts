import { createBrowserClient, createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env, hasSupabaseEnv } from "./env";

const missingUrl = "https://example.supabase.co";
const missingKey = "missing-key";
type CookieToSet = { name: string; value: string; options: CookieOptions };

export function createSupabaseBrowserClient() {
  return createBrowserClient(env.supabaseUrl || missingUrl, env.supabaseAnonKey || missingKey);
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl || missingUrl, env.supabaseAnonKey || missingKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always set cookies; Server Actions and Route Handlers can.
        }
      }
    }
  });
}

export function createSupabaseAdminClient() {
  if (!hasSupabaseEnv() || !env.supabaseServiceRoleKey) {
    return null;
  }

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
