import { z } from "zod";

export const newsletterPayloadSchema = z.object({
  email: z.email("Please enter a valid email address.").max(200),
  source: z.enum(["footer", "blog"]).optional(),
  // Honeypot: real visitors never see or fill this field, bots usually do.
  website: z.string().max(200).optional(),
});

export type NewsletterPayload = z.infer<typeof newsletterPayloadSchema>;

/** Same address may (re)submit at most this many times per hour. */
export const NEWSLETTER_MAX_PER_HOUR = 3;
