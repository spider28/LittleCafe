import type { User } from "@supabase/supabase-js";
import { env } from "./env";
import { createSupabaseServerClient } from "./supabase";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function isAdminUser(user: User | null) {
  if (!user) {
    return false;
  }

  if (env.adminEmail && user.email?.toLowerCase() === env.adminEmail.toLowerCase()) {
    return true;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("admin_profiles")
    .select("id")
    .or(`user_id.eq.${user.id},email.eq.${user.email ?? ""}`)
    .maybeSingle();

  return Boolean(data && !error);
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  const allowed = await isAdminUser(user);
  return { user, allowed };
}
