import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calendar, ChevronRight, Clock, X } from "lucide-react";
import type { Prisma } from "@/generated/client/client";
import { prisma } from "@/lib/prisma";
import { POSTS_PER_PAGE, cardSummary, formatDate, postCardSelect, publishedWhere } from "@/lib/blog";
import { NewsletterCta } from "./NewsletterCta";
import { PostCard, PostImage } from "./PostCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog — Cuelara",
  description: "Deep dives into token optimization, prompt heuristics, and how to build production-ready AI applications.",
  alternates: { canonical: "/blog" },
};

type SearchParams = Promise<{ category?: string; tag?: string; page?: string }>;

function blogHref({ category, tag, page }: { category?: string; tag?: string; page?: number }) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (tag) params.set("tag", tag);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/blog?${query}` : "/blog";
}

// 1 … 4 5 [6] 7 8 … 20
function pageWindow(current: number, total: number): (number | "gap")[] {
  const pages = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ["gap" as const, p] : [p]));
}

export default async function BlogPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const { category, tag } = sp;
  const hasFilter = Boolean(category || tag);

  const filters: Prisma.BlogPostWhereInput[] = [publishedWhere()];
  if (category) filters.push({ categories: { some: { slug: category } } });
  if (tag) filters.push({ tags: { some: { slug: tag } } });
  const where: Prisma.BlogPostWhereInput = { AND: filters };

  // The newest post is featured on the unfiltered first page and is kept out of the grid on every page.
  const featured = hasFilter
    ? null
    : await prisma.blogPost.findFirst({ where, orderBy: { publishedAt: "desc" }, select: postCardSelect });
  const gridWhere: Prisma.BlogPostWhereInput = featured ? { AND: [where, { id: { not: featured.id } }] } : where;

  const [posts, total, categories, activeTag] = await Promise.all([
    prisma.blogPost.findMany({
      where: gridWhere,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * POSTS_PER_PAGE,
      take: POSTS_PER_PAGE,
      select: postCardSelect,
    }),
    prisma.blogPost.count({ where: gridWhere }),
    prisma.blogCategory.findMany({
      where: { posts: { some: publishedWhere() } },
      orderBy: { name: "asc" },
      select: { name: true, slug: true },
    }),
    tag ? prisma.blogTag.findUnique({ where: { slug: tag }, select: { name: true } }) : null,
  ]);
  const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
  const showFeatured = featured && page === 1;
  const isEmpty = !featured && posts.length === 0;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <section className="relative w-full overflow-hidden pb-16 pt-32 md:pb-24 md:pt-40">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
            Engineering Blog
          </div>
          <h1 className="mb-6 text-4xl font-black tracking-tight text-foreground md:text-6xl">
            Engineering the Future <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">of AI Prompts</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            Deep dives into token optimization, prompt heuristics, and how to build production-ready AI applications.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-6 pb-24">
        {showFeatured && (
          <Link
            href={`/blog/${featured.slug}`}
            className="group relative mb-16 flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm transition-all duration-500 hover:shadow-xl lg:flex-row"
          >
            <div className="relative h-[300px] overflow-hidden lg:h-[400px] lg:w-3/5">
              <PostImage src={featured.imageUrl} alt={featured.title} className="h-full w-full transition-transform duration-700 group-hover:scale-105" />
            </div>
            <div className="relative flex flex-col justify-center p-8 md:p-10 lg:w-2/5">
              <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-muted-foreground">
                {featured.categories[0] && (
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-primary">{featured.categories[0].name}</span>
                )}
                {featured.publishedAt && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> {formatDate(featured.publishedAt)}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> {featured.readingMinutes} min read
                </span>
              </div>
              <h2 className="mb-4 text-2xl font-bold leading-tight text-foreground transition-colors group-hover:text-primary md:text-3xl">{featured.title}</h2>
              <p className="mb-8 leading-relaxed text-muted-foreground">{cardSummary(featured)}</p>
              <div className="mt-auto flex items-center gap-2 text-sm font-bold text-primary transition-transform group-hover:translate-x-2">
                Read Article <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        )}

        {(categories.length > 0 || hasFilter) && (
          <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-4">
            {[{ name: "All", slug: undefined }, ...categories].map((c) => {
              const isActive = !tag && category === c.slug;
              return (
                <Link
                  key={c.slug ?? "all"}
                  href={blogHref({ category: c.slug })}
                  className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  {c.name}
                </Link>
              );
            })}
            {activeTag && (
              <Link
                href="/blog"
                className="flex items-center gap-2 whitespace-nowrap rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                #{activeTag.name} <X className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        )}

        {isEmpty ? (
          <div className="rounded-3xl border border-dashed border-border py-24 text-center">
            <h2 className="mb-2 text-xl font-bold text-foreground">{hasFilter ? "No posts match this filter" : "No posts yet"}</h2>
            <p className="mb-6 text-muted-foreground">{hasFilter ? "Try another category or clear the filter." : "New articles are on the way. Check back soon."}</p>
            {hasFilter && (
              <Link href="/blog" className="text-sm font-bold text-primary hover:underline">
                View all posts
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link href={blogHref({ category, tag, page: page - 1 })} aria-label="Previous page" className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <ChevronRight className="h-5 w-5 rotate-180" />
              </Link>
            )}
            {pageWindow(page, totalPages).map((p, i) =>
              p === "gap" ? (
                <span key={`gap-${i}`} className="px-2 text-muted-foreground">
                  …
                </span>
              ) : (
                <Link
                  key={p}
                  href={blogHref({ category, tag, page: p })}
                  aria-current={p === page ? "page" : undefined}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                    p === page ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {p}
                </Link>
              )
            )}
            {page < totalPages && (
              <Link href={blogHref({ category, tag, page: page + 1 })} aria-label="Next page" className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <ChevronRight className="h-5 w-5" />
              </Link>
            )}
          </nav>
        )}

        <NewsletterCta />
      </div>
    </div>
  );
}
