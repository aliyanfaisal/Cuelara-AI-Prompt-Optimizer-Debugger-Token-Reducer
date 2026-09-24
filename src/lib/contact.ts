import { z } from "zod";

export const contactPayloadSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(100),
  email: z.email("Please enter a valid email address.").max(200),
  subject: z.string().trim().max(150).optional(),
  message: z.string().trim().min(10, "Please write at least 10 characters.").max(5000),
  plan: z.string().trim().max(50).optional(),
  // Honeypot: real visitors never see or fill this field, bots usually do.
  website: z.string().max(200).optional(),
});

export type ContactPayload = z.infer<typeof contactPayloadSchema>;

/** Same address may send at most this many messages per hour. */
export const CONTACT_MAX_PER_HOUR = 3;
