import { Prisma } from "@/generated/client/client";
import { prisma } from "@/lib/prisma";
import { resolveUniqueSlug } from "@/lib/blog-sync/slug";
import type { CookbookPromptPayload } from "./schema";

export interface UpsertResult {
  id: string;
  slug: string;
  created: boolean;
  /** False when an "update" for an already-existing external_id carried no actual field changes —
   * a resync or retry of the same payload. Callers use this to skip re-notifying Google. */
  changed: boolean;
}

export class UnknownCategoryError extends Error {
  constructor(public readonly slug: string) {
    super(`Unknown category "${slug}".`);
  }
}

async function save(tx: Prisma.TransactionClient, data: CookbookPromptPayload): Promise<UpsertResult> {
  const category = await tx.cookbookCategory.findUnique({ where: { slug: data.category }, select: { id: true } });
  if (!category) throw new UnknownCategoryError(data.category);

  const existing = await tx.cookbookPrompt.findUnique({
    where: { externalId: data.external_id },
    select: {
      id: true, slug: true, title: true, categoryId: true, explanation: true, whenToUse: true, bestPractices: true,
      commonMistakes: true, promptTemplate: true, exampleInput: true, exampleOutput: true, faqs: true,
      seoTitle: true, seoDesc: true, image: true, published: true,
    },
  });

  const fields = {
    title: data.title,
    categoryId: category.id,
    explanation: data.explanation,
    whenToUse: data.when_to_use,
    bestPractices: data.best_practices,
    commonMistakes: data.common_mistakes,
    promptTemplate: data.prompt_template,
    exampleInput: data.example_input,
    exampleOutput: data.example_output,
    faqs: data.faqs,
    seoTitle: data.seo_title,
    seoDesc: data.seo_desc,
    image: data.image_url ?? null,
    published: data.published,
  };

  if (existing) {
    const unchanged = (Object.keys(fields) as (keyof typeof fields)[]).every((key) => existing[key] === fields[key]);

    // A resync/retry that repeats an already-applied payload skips the write entirely — otherwise
    // it would bump updatedAt (which the sitemap reports to Google as a "changed" lastmod) for
    // nothing, on top of re-firing the indexing notification below for content that never changed.
    if (unchanged) return { id: existing.id, slug: existing.slug, created: false, changed: false };

    // The slug is deliberately left out: a published URL must never change on update.
    const prompt = await tx.cookbookPrompt.update({ where: { id: existing.id }, data: fields, select: { id: true, slug: true } });
    return { ...prompt, created: false, changed: true };
  }

  const slug = await resolveUniqueSlug(
    data.slug,
    async (candidate) => (await tx.cookbookPrompt.findUnique({ where: { slug: candidate }, select: { id: true } })) !== null
  );
  const prompt = await tx.cookbookPrompt.create({ data: { ...fields, externalId: data.external_id, slug }, select: { id: true, slug: true } });
  return { ...prompt, created: true, changed: true };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

// A concurrent delivery can win the race for the same external_id or slug; retrying the whole
// transaction then takes the update path (or picks the next free slug) instead of failing.
export async function upsertCookbookPrompt(data: CookbookPromptPayload): Promise<UpsertResult> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction((tx) => save(tx, data), { maxWait: 10_000, timeout: 20_000 });
    } catch (error) {
      if (isUniqueViolation(error) && attempt < 2) continue;
      throw error;
    }
  }
}
