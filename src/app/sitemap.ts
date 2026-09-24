import type { MetadataRoute } from "next";
import { publishedWhere, siteUrl } from "@/lib/blog";
import { publishedCookbookWhere } from "@/lib/cookbook";
import { prisma } from "@/lib/prisma";

// Rendered per request so newly pushed posts show up immediately instead of waiting for the next build.
export const dynamic = "force-dynamic";

// The "coming soon" pages (docs, changelog, about, privacy, terms) are left out on
// purpose while they are noindex — add them here when their real content ships.
const STATIC_PATHS = [
  "/",
  "/tools",
  "/tools/prompt-optimizer",
  "/tools/context-extractor",
  "/tools/token-optimizer",
  "/tools/compare-estimate",
  "/tools/prompt-debugger",
  "/tools/intelligence-score",
  "/tools/prompt-formatter",
  "/tools/site-to-prompt",
  "/cookbook",
  "/pricing",
  "/contact",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  let posts: { slug: string; updatedAt: Date }[] = [];
  try {
    posts = await prisma.blogPost.findMany({
      where: publishedWhere(),
      orderBy: { publishedAt: "desc" },
      select: { slug: true, updatedAt: true },
      take: 5000,
    });
  } catch (error) {
    // A database hiccup should degrade to the static pages, not a 500 for the crawler.
    console.error("Sitemap: could not load blog posts", error);
  }

  let cookbookPrompts: { slug: string; updatedAt: Date }[] = [];
  try {
    cookbookPrompts = await prisma.cookbookPrompt.findMany({
      where: publishedCookbookWhere(),
      orderBy: { updatedAt: "desc" },
      select: { slug: true, updatedAt: true },
      take: 5000,
    });
  } catch (error) {
    console.error("Sitemap: could not load cookbook prompts", error);
  }

  const latestPost = posts.reduce<Date | undefined>((latest, p) => (!latest || p.updatedAt > latest ? p.updatedAt : latest), undefined);

  return [
    ...STATIC_PATHS.map((path) => ({ url: `${base}${path}` })),
    { url: `${base}/blog`, lastModified: latestPost },
    ...posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.updatedAt })),
    ...cookbookPrompts.map((p) => ({ url: `${base}/prompt/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
