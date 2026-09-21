import type { Prisma } from "@/generated/client/client";

export const POSTS_PER_PAGE = 9;

/** Drafts and future-dated posts are never public. */
export function publishedWhere(): Prisma.BlogPostWhereInput {
  return { status: "published", publishedAt: { lte: new Date() } };
}

export type PostState = "live" | "scheduled" | "draft";

export function postState(status: "draft" | "published", publishedAt: Date | null): PostState {
  if (status === "draft") return "draft";
  return publishedAt && publishedAt.getTime() <= Date.now() ? "live" : "scheduled";
}

/** Publishing a draft (or a scheduled post) makes it live now; an existing past publish date is kept. */
export function publishedAtFor(status: "draft" | "published", current: Date | null, now = new Date()): Date | null {
  return status === "published" && (!current || current > now) ? now : current;
}

export function siteUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function readingTimeMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

/** Plain-text summary cut from the start of a Markdown body. */
export function plainTextSummary(markdown: string, max = 200): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/** The post's excerpt, or a plain-text teaser of its body. Takes a full post (with `content`). */
export function teaser(post: { excerpt: string | null; content: string }, max = 160): string {
  return post.excerpt?.trim() || plainTextSummary(post.content, max);
}

/** What list cards show, using only the precomputed columns — never the body. */
export function cardSummary(post: { excerpt: string | null; teaser: string | null }): string {
  return post.excerpt?.trim() || post.teaser || "";
}

export const postCardSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  teaser: true,
  readingMinutes: true,
  imageUrl: true,
  publishedAt: true,
  categories: { select: { name: true, slug: true }, orderBy: { name: "asc" } },
} satisfies Prisma.BlogPostSelect;

export type PostCardData = Prisma.BlogPostGetPayload<{ select: typeof postCardSelect }>;
