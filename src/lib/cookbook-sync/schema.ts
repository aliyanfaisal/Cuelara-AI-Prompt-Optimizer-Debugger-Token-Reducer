import { z } from "zod";
import { parseFaqs } from "@/lib/cookbook";

const httpUrl = z.url({ protocol: /^https?$/, message: "Must be a valid http(s) URL." });
const markdown = z.string().trim().min(1);

export const cookbookPromptPayloadSchema = z.object({
  external_id: z.number().int().positive().max(2_147_483_647),
  title: z.string().trim().min(1).max(255),
  slug: z
    .string()
    .max(255)
    .regex(/^[A-Za-z0-9_-]+$/, "May only contain letters, numbers, dashes and underscores."),
  // Slug of an existing CookbookCategory. Categories are curated, so an unknown one is rejected, not created.
  category: z.string().trim().min(1).max(100),
  explanation: markdown,
  when_to_use: markdown,
  best_practices: markdown,
  common_mistakes: markdown,
  prompt_template: markdown,
  example_input: markdown,
  example_output: markdown,
  // "### Question" headings followed by the answer: the detail page turns these into FAQPage structured data.
  faqs: markdown.refine((v) => {
    const count = parseFaqs(v).length;
    return count >= 3 && count <= 5;
  }, 'Must contain 3 to 5 FAQs, each written as a "### Question" heading followed by its answer.'),
  seo_title: z.string().trim().min(30).max(60),
  seo_desc: z.string().trim().min(120).max(160),
  image_url: httpUrl.nullish(),
  published: z.boolean().default(true),
});

export type CookbookPromptPayload = z.infer<typeof cookbookPromptPayloadSchema>;
