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
