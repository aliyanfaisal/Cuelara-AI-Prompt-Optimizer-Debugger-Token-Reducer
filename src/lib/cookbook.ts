import type { Prisma } from "@/generated/client/client";

export function publishedCookbookWhere(): Prisma.CookbookPromptWhereInput {
  return { published: true };
}

export const cookbookPromptCardSelect = {
  id: true,
  title: true,
  slug: true,
  image: true,
  explanation: true,
  updatedAt: true,
  category: { select: { name: true, slug: true } },
} satisfies Prisma.CookbookPromptSelect;

export type CookbookPromptCardData = Prisma.CookbookPromptGetPayload<{ select: typeof cookbookPromptCardSelect }>;

export const COOKBOOK_PER_PAGE = 12;

/** Listing cards also preview the start of the prompt template. */
export const cookbookListSelect = {
  ...cookbookPromptCardSelect,
  promptTemplate: true,
} satisfies Prisma.CookbookPromptSelect;

export type CookbookListData = Prisma.CookbookPromptGetPayload<{ select: typeof cookbookListSelect }>;

/** Splits a Markdown FAQ body written as "### Question" headings into pairs (used for FAQPage structured data). */
export function parseFaqs(markdown: string | null): { question: string; answer: string }[] {
  if (!markdown) return [];
  return markdown
    .split(/^###\s+/m)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [question, ...rest] = chunk.split("\n");
      return { question: question.trim(), answer: rest.join(" ").replace(/\s+/g, " ").trim() };
    })
    .filter((f) => f.question && f.answer);
}
