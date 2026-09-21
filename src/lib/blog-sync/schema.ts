import { z } from "zod";

const httpUrl = z.url({ protocol: /^https?$/, message: "Must be a valid http(s) URL." });
const label = z.string().trim().min(1).max(100);

export const blogPostPayloadSchema = z.object({
  external_id: z.number().int().positive().max(2_147_483_647),
  title: z.string().trim().min(1).max(255),
  slug: z
    .string()
    .max(255)
    .regex(/^[A-Za-z0-9_-]+$/, "May only contain letters, numbers, dashes and underscores."),
  excerpt: z.string().max(500).nullish(),
  body: z.string().min(1),
  status: z.enum(["draft", "published"]),
  image_url: httpUrl.nullish(),
  source_image_url: httpUrl.nullish(),
  categories: z.array(label).max(50).default([]),
  tags: z.array(label).max(50).default([]),
  published_at: z.iso.datetime({ offset: true }).nullish(),
  canonical_url: httpUrl,
});

export type BlogPostPayload = z.infer<typeof blogPostPayloadSchema>;

export function formatValidationErrors(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}
