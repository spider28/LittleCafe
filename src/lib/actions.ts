"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Resend } from "resend";
import { cafe } from "./content";
import { env } from "./env";
import { contactSchema, galleryUploadSchema, reservationSchema, waiverSchema } from "./schemas";
import { requireAdmin } from "./admin";
import { createSupabaseAdminClient, createSupabaseServerClient } from "./supabase";

export type ActionState = { ok: boolean; message: string };

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

export async function uploadGalleryPhotoAction(formData: FormData) {
  const { allowed } = await requireAdmin();
  if (!allowed) redirect("/admin");

  const parsed = galleryUploadSchema.parse({
    altText: formValue(formData, "altText"),
    displayOrder: formValue(formData, "displayOrder")
  });
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return;
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return;
  }

  const extension = file.name.split(".").pop() || "jpg";
  const path = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const upload = await admin.storage.from("gallery").upload(path, file, { upsert: false });
  if (upload.error) {
    return;
  }

  const { data } = admin.storage.from("gallery").getPublicUrl(path);
  await admin.from("gallery_photos").insert({
    storage_path: path,
    public_url: data.publicUrl,
    alt_text: parsed.altText,
    display_order: parsed.displayOrder
  });

  revalidatePath("/gallery");
  revalidatePath("/admin");
}

export async function deleteGalleryPhotoAction(formData: FormData) {
  const { allowed } = await requireAdmin();
  if (!allowed) redirect("/admin");

  const id = formValue(formData, "id");
  const path = formValue(formData, "storagePath");
  const admin = createSupabaseAdminClient();
  if (!admin) return;

  if (path) {
    await admin.storage.from("gallery").remove([path]);
  }
  await admin.from("gallery_photos").delete().eq("id", id);
  revalidatePath("/gallery");
  revalidatePath("/admin");
}
