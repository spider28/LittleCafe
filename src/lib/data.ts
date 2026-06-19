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

export async function getAdminCollections(query?: { waiver?: string; date?: string }) {
  const supabase = await createSupabaseServerClient();
  const [settings, gallery, reservations, contacts] = await Promise.all([
    getChatbotSettings(),
    supabase.from("gallery_photos").select("*").order("display_order"),
    supabase.from("reservations").select("*").order("starts_at", { ascending: false }).limit(20),
    supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(20)
  ]);

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
  const waivers = await waiverQuery;

  return {
    settings,
    gallery: gallery.data ?? [],
    reservations: reservations.data ?? [],
    contacts: contacts.data ?? [],
    waivers: waivers.data ?? []
  };
}
