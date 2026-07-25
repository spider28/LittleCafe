import { unstable_noStore as noStore } from "next/cache";
import { fallbackGallery } from "./content";
import { createSupabaseServerClient } from "./supabase";

export type ChatbotProvider = "openai" | "github";

export type ChatbotSettings = {
  enabled: boolean;
  provider: ChatbotProvider;
};

export const defaultChatbotSettings: ChatbotSettings = {
  enabled: true,
  provider: "openai"
};

export async function getChatbotSettings(): Promise<ChatbotSettings> {
  noStore();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("chatbot_enabled, chatbot_provider")
    .eq("id", "global")
    .maybeSingle();

  if (error || !data) {
    return defaultChatbotSettings;
  }

  return {
    enabled: data.chatbot_enabled,
    provider: data.chatbot_provider
  };
}

export async function getGalleryPhotos() {
  noStore();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("gallery_photos").select("*").order("display_order");
  if (error || !data?.length) {
    return fallbackGallery;
  }
  return data;
}

export function getWeekRange(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export async function getWeeklyReservations() {
  noStore();
  const { start, end } = getWeekRange();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at");

  if (error) {
    return [];
  }

  return data ?? [];
}

export async function getAdminOverview() {
  noStore();
  const supabase = await createSupabaseServerClient();
  const [settings, knowledge, gallery, reservations, waivers, contacts] = await Promise.all([
    getChatbotSettings(),
    supabase.from("chatbot_knowledge_chunks").select("id", { count: "exact", head: true }),
    supabase.from("gallery_photos").select("id", { count: "exact", head: true }),
    supabase.from("reservations").select("id", { count: "exact", head: true }),
    supabase.from("waiver_submissions").select("id", { count: "exact", head: true }),
    supabase.from("contact_messages").select("id", { count: "exact", head: true })
  ]);

  return {
    settings,
    counts: {
      knowledge: knowledge.count ?? 0,
      gallery: gallery.count ?? 0,
      reservations: reservations.count ?? 0,
      waivers: waivers.count ?? 0,
      contacts: contacts.count ?? 0
    }
  };
}

export async function getAdminChatbotData() {
  noStore();
  const supabase = await createSupabaseServerClient();
  const [settings, knowledge] = await Promise.all([
    getChatbotSettings(),
    supabase
      .from("chatbot_knowledge_chunks")
      .select("id,title,source,content,active,created_at")
      .order("created_at", { ascending: false })
      .limit(50)
  ]);

  return {
    settings,
    knowledge: knowledge.data ?? []
  };
}

export async function getAdminGalleryData() {
  noStore();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("gallery_photos").select("*").order("display_order");
  return data ?? [];
}

export async function getAdminReservationsData() {
  noStore();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("reservations").select("*").order("starts_at", { ascending: false }).limit(50);
  return data ?? [];
}

export async function getAdminWaivers(query?: { waiver?: string; date?: string }) {
  noStore();
  const supabase = await createSupabaseServerClient();
  let waiverQuery = supabase.from("waiver_submissions").select("*").order("created_at", { ascending: false }).limit(30);
  if (query?.waiver) {
    const pattern = `%${query.waiver}%`;
    waiverQuery = waiverQuery.or(`full_name.ilike.${pattern},phone.ilike.${pattern}`);
  }
  if (query?.date) {
    const start = new Date(`${query.date}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    waiverQuery = waiverQuery.gte("created_at", start.toISOString()).lt("created_at", end.toISOString());
  }
  const { data } = await waiverQuery;
  return data ?? [];
}

export async function getAdminMessages() {
  noStore();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(50);
  return data ?? [];
}
