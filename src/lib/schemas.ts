import { z } from "zod";
import { cafe } from "./content";

export const contactSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name."),
  email: z.string().trim().email("Enter a valid email."),
  phone: z.string().trim().optional(),
  message: z.string().trim().min(10, "Tell us a little more.")
});

export const waiverSchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(7),
  email: z.string().trim().email().optional().or(z.literal("")),
  agreements: z.array(z.string()).length(cafe.agreements.length),
  signature: z.string().trim().min(2)
});

export const reservationSchema = z
  .object({
    title: z.string().trim().min(2),
    guestName: z.string().trim().optional(),
    guestPhone: z.string().trim().optional(),
    partySize: z.coerce.number().int().min(1).max(40),
    status: z.enum(["reserved", "seated", "completed", "cancelled"]).default("reserved"),
    startsAt: z.string().min(1),
    endsAt: z.string().min(1),
    notes: z.string().trim().optional()
  })
  .refine((value) => new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(), {
    path: ["endsAt"],
    message: "End time must be after start time."
  });

export const galleryUploadSchema = z.object({
  altText: z.string().trim().min(2),
  displayOrder: z.coerce.number().int().min(0).default(0)
});
