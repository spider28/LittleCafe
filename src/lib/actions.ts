"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Resend } from "resend";
import { cafe } from "./content";
import { env, hasSupabaseEnv } from "./env";
import { chatbotKnowledgeSchema, contactSchema, galleryUploadSchema, reservationSchema, waiverSchema } from "./schemas";
import { requireAdmin } from "./admin";
import { getChatbotSettings } from "./data";
import { createSupabaseServerClient } from "./supabase";
import { createEmbedding } from "./rag";

export type ActionState = { ok: boolean; message: string };

const galleryBucket = "gallery";
const maxGalleryPhotoSize = 8 * 1024 * 1024;
const allowedGalleryPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function signInAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: formValue(formData, "email"),
    password: formValue(formData, "password")
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin");
  redirect("/admin");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin");
}

export async function submitContactAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = contactSchema.safeParse({
    fullName: formValue(formData, "fullName"),
    email: formValue(formData, "email"),
    phone: formValue(formData, "phone"),
    message: formValue(formData, "message")
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contact_messages")
    .insert({
      full_name: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      message: parsed.data.message,
      email_status: "pending"
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: "We could not save your message yet. Please try again later." };
  }

  let emailStatus: "sent" | "failed" = "failed";
  if (env.resendApiKey && env.adminEmail) {
    try {
      const resend = new Resend(env.resendApiKey);
      await resend.emails.send({
        from: "LittleCafe <onboarding@resend.dev>",
        to: env.adminEmail,
        replyTo: parsed.data.email,
        subject: `New LittleCafe message from ${parsed.data.fullName}`,
        text: `${parsed.data.message}\n\nFrom: ${parsed.data.fullName}\nEmail: ${parsed.data.email}\nPhone: ${parsed.data.phone || "N/A"}`
      });
      emailStatus = "sent";
    } catch {
      emailStatus = "failed";
    }
  }

  await supabase.from("contact_messages").update({ email_status: emailStatus }).eq("id", data.id);
  revalidatePath("/admin");
  return { ok: true, message: "Thanks. Your message has been sent to the cafe team." };
}

export async function submitWaiverAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = waiverSchema.safeParse({
    fullName: formValue(formData, "fullName"),
    phone: formValue(formData, "phone"),
    email: formValue(formData, "email"),
    agreements: formData.getAll("agreements").map(String),
    signature: formValue(formData, "signature")
  });

  if (!parsed.success) {
    return { ok: false, message: "Please complete every agreement and signature field." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("waiver_submissions").insert({
    full_name: parsed.data.fullName,
    phone: parsed.data.phone,
    email: parsed.data.email || null,
    agreements: cafe.agreements,
    signature: parsed.data.signature
  });

  if (error) {
    return { ok: false, message: "We could not save the waiver yet. Please try again." };
  }

  revalidatePath("/admin");
  return { ok: true, message: "Waiver submitted. Thank you." };
}

export async function createReservationAction(formData: FormData) {
  const { allowed } = await requireAdmin();
  if (!allowed) {
    redirect("/admin");
  }

  const parsed = reservationSchema.parse({
    title: formValue(formData, "title"),
    guestName: formValue(formData, "guestName"),
    guestPhone: formValue(formData, "guestPhone"),
    partySize: formValue(formData, "partySize"),
    status: formValue(formData, "status") || "reserved",
    startsAt: formValue(formData, "startsAt"),
    endsAt: formValue(formData, "endsAt"),
    notes: formValue(formData, "notes")
  });

  const supabase = await createSupabaseServerClient();
  await supabase.from("reservations").insert({
    title: parsed.title,
    guest_name: parsed.guestName || null,
    guest_phone: parsed.guestPhone || null,
    party_size: parsed.partySize,
    status: parsed.status,
    starts_at: new Date(parsed.startsAt).toISOString(),
    ends_at: new Date(parsed.endsAt).toISOString(),
    notes: parsed.notes || null
  });

  revalidatePath("/calendar");
  revalidatePath("/admin");
}

export async function deleteReservationAction(formData: FormData) {
  const { allowed } = await requireAdmin();
  if (!allowed) redirect("/admin");
  const supabase = await createSupabaseServerClient();
  await supabase.from("reservations").delete().eq("id", formValue(formData, "id"));
  revalidatePath("/calendar");
  revalidatePath("/admin");
}

export async function uploadGalleryPhotoAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { allowed } = await requireAdmin();
  if (!allowed) redirect("/admin");

  if (!hasSupabaseEnv()) {
    return { ok: false, message: "Supabase is not configured yet. Add the project URL and anon key." };
  }

  const parsed = galleryUploadSchema.safeParse({
    altText: formValue(formData, "altText"),
    displayOrder: formValue(formData, "displayOrder")
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the gallery details." };
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a photo to upload." };
  }
  if (!allowedGalleryPhotoTypes.has(file.type)) {
    return { ok: false, message: "Upload a JPG, PNG, WebP, or GIF image." };
  }
  if (file.size > maxGalleryPhotoSize) {
    return { ok: false, message: "Photos must be 8 MB or smaller." };
  }

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`;
  const supabase = await createSupabaseServerClient();
  const upload = await supabase.storage.from(galleryBucket).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false
  });
  if (upload.error) {
    return { ok: false, message: `Photo upload failed: ${upload.error.message}` };
  }

  const { data } = supabase.storage.from(galleryBucket).getPublicUrl(path);
  const insert = await supabase.from("gallery_photos").insert({
    storage_path: path,
    public_url: data.publicUrl,
    alt_text: parsed.data.altText,
    display_order: parsed.data.displayOrder
  });
  if (insert.error) {
    await supabase.storage.from(galleryBucket).remove([path]);
    return { ok: false, message: `Photo saved, but gallery metadata failed: ${insert.error.message}` };
  }

  revalidatePath("/gallery");
  revalidatePath("/admin");
  return { ok: true, message: "Photo uploaded to the gallery." };
}

export async function deleteGalleryPhotoAction(formData: FormData) {
  const { allowed } = await requireAdmin();
  if (!allowed) redirect("/admin");

  const id = formValue(formData, "id");
  const path = formValue(formData, "storagePath");
  const supabase = await createSupabaseServerClient();

  if (path) {
    await supabase.storage.from(galleryBucket).remove([path]);
  }
  await supabase.from("gallery_photos").delete().eq("id", id);
  revalidatePath("/gallery");
  revalidatePath("/admin");
}

export async function updateChatbotSettingsAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { allowed } = await requireAdmin();
  if (!allowed) redirect("/admin");

  const provider = formValue(formData, "provider");
  if (provider !== "openai" && provider !== "github") {
    return { ok: false, message: "Choose OpenAI or GitHub as the chatbot provider." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("site_settings").upsert({
    id: "global",
    chatbot_enabled: formData.get("enabled") === "on",
    chatbot_provider: provider,
    updated_at: new Date().toISOString()
  });

  if (error) {
    return { ok: false, message: "Chatbot settings could not be saved. Make sure the latest Supabase schema has been applied." };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: "Chatbot settings saved." };
}

export async function createChatbotKnowledgeAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { allowed } = await requireAdmin();
  if (!allowed) redirect("/admin");

  const parsed = chatbotKnowledgeSchema.safeParse({
    title: formValue(formData, "title"),
    source: formValue(formData, "source"),
    content: formValue(formData, "content"),
    active: formData.get("active") === "on"
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the knowledge details." };
  }

  let embedding: number[];
  try {
    const settings = await getChatbotSettings();
    embedding = await createEmbedding(`${parsed.data.title}\n\n${parsed.data.content}`, settings.provider);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Embedding generation failed." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("chatbot_knowledge_chunks").insert({
    title: parsed.data.title,
    source: parsed.data.source || "admin",
    content: parsed.data.content,
    active: parsed.data.active,
    embedding
  });

  if (error) {
    return { ok: false, message: "Knowledge could not be saved. Make sure the latest Supabase schema has been applied." };
  }

  revalidatePath("/admin");
  return { ok: true, message: "Knowledge added to chatbot retrieval." };
}

export async function deleteChatbotKnowledgeAction(formData: FormData) {
  const { allowed } = await requireAdmin();
  if (!allowed) redirect("/admin");

  const supabase = await createSupabaseServerClient();
  await supabase.from("chatbot_knowledge_chunks").delete().eq("id", formValue(formData, "id"));
  revalidatePath("/admin");
}
