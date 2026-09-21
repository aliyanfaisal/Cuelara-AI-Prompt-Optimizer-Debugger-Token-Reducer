import { Prisma } from "@/generated/client/client";
import { prisma } from "@/lib/prisma";
import type { BlogPostPayload } from "./schema";
import { resolveUniqueSlug, toLabelSlugs } from "./slug";

export interface UpsertResult {
  id: string;
  slug: string;
  created: boolean;
}

interface LabelDelegate {
  createMany(args: { data: { name: string; slug: string }[]; skipDuplicates: boolean }): PromiseLike<unknown>;
  findMany(args: { where: { slug: { in: string[] } }; select: { id: true } }): PromiseLike<{ id: string }[]>;
}

async function labelIds(delegate: LabelDelegate, names: string[]): Promise<{ id: string }[]> {
  const labels = toLabelSlugs(names);
  if (labels.length === 0) return [];
  await delegate.createMany({ data: labels, skipDuplicates: true });
  return delegate.findMany({ where: { slug: { in: labels.map((l) => l.slug) } }, select: { id: true } });
}

async function save(tx: Prisma.TransactionClient, data: BlogPostPayload): Promise<UpsertResult> {
  const existing = await tx.blogPost.findUnique({
    where: { externalId: data.external_id },
    select: { id: true, slug: true, publishedAt: true },
  });

  const publishedAt = data.published_at
    ? new Date(data.published_at)
    : (existing?.publishedAt ?? (data.status === "published" ? new Date() : null));

  const fields = {
    title: data.title,
    content: data.body,
    excerpt: data.excerpt ?? null,
    status: data.status,
    published: data.status === "published",
    publishedAt,
    imageUrl: data.image_url ?? null,
    sourceImageUrl: data.source_image_url ?? null,
    canonicalUrl: data.canonical_url,
  };

  const categories = await labelIds(tx.blogCategory, data.categories);
  const tags = await labelIds(tx.blogTag, data.tags);

  if (existing) {
    // The slug is deliberately left out: a published URL must never change on update.
    const post = await tx.blogPost.update({
      where: { id: existing.id },
      data: { ...fields, categories: { set: categories }, tags: { set: tags } },
      select: { id: true, slug: true },
    });
    return { ...post, created: false };
  }

  const slug = await resolveUniqueSlug(
    data.slug,
    async (candidate) => (await tx.blogPost.findUnique({ where: { slug: candidate }, select: { id: true } })) !== null
  );
  const post = await tx.blogPost.create({
    data: { ...fields, externalId: data.external_id, slug, categories: { connect: categories }, tags: { connect: tags } },
    select: { id: true, slug: true },
  });
  return { ...post, created: true };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

// A concurrent delivery can win the race for the same external_id or slug; retrying the whole
// transaction then takes the update path (or picks the next free slug) instead of failing.
export async function upsertBlogPost(data: BlogPostPayload): Promise<UpsertResult> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction((tx) => save(tx, data), { maxWait: 10_000, timeout: 20_000 });
    } catch (error) {
      if (isUniqueViolation(error) && attempt < 2) continue;
      throw error;
    }
  }
}
