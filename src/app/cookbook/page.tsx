import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Search, X } from "lucide-react";
import type { Prisma } from "@/generated/client/client";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/blog";
import { COOKBOOK_PER_PAGE, cookbookListSelect, publishedCookbookWhere } from "@/lib/cookbook";
import { PromptCard } from "./PromptCard";
import { CategorySelect } from "./CategorySelect";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ category?: string; q?: string; page?: string }>;

const TITLE = "Prompt Cookbook: Free, Tested AI Prompt Templates";
const DESCRIPTION =
  "A curated library of production-ready prompt templates for ChatGPT, Claude and Gemini. Browse by category, copy the prompt, and see a worked example for coding, SEO, data extraction, marketing and more.";

function cookbookHref({ category, q, page }: { category?: string; q?: string; page?: number }) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/cookbook?${query}` : "/cookbook";
}

// A category also matches prompts filed under its sub-categories.
function categoryFilter(slug: string): Prisma.CookbookPromptWhereInput {
  return { OR: [{ category: { slug } }, { category: { parent: { slug } } }] };
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { category, q, page } = await searchParams;
  const base = siteUrl();

  if (category && !q) {
    const cat = await prisma.cookbookCategory.findUnique({ where: { slug: category }, select: { name: true, description: true } });
    if (cat) {
      const title = `${cat.name} Prompts: Copy-Paste AI Prompt Templates`;
      const description = cat.description ?? `Browse ${cat.name} prompt templates from the Cuelara cookbook, each with a worked example.`;
      const canonical = `${base}${cookbookHref({ category })}`;
      return {
        title,
        description,
        alternates: { canonical },
        openGraph: { type: "website", url: canonical, title, description },
        twitter: { card: "summary", title, description },
        // Deep pages of a filtered list add little on their own.
        robots: page && page !== "1" ? { index: false, follow: true } : undefined,
      };
    }
  }

  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: `${base}/cookbook` },
    openGraph: { type: "website", url: `${base}/cookbook`, title: TITLE, description: DESCRIPTION },
    twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
    // Search results and paginated pages are thin duplicates of the main list: keep them out of the index.
    robots: q || (page && page !== "1") ? { index: false, follow: true } : undefined,
  };
}

export default async function CookbookPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const category = sp.category || undefined;

  const filters: Prisma.CookbookPromptWhereInput[] = [publishedCookbookWhere()];
  if (category) filters.push(categoryFilter(category));
  if (q) {
    filters.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { explanation: { contains: q, mode: "insensitive" } },
        { promptTemplate: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  const where: Prisma.CookbookPromptWhereInput = { AND: filters };

  const [prompts, total, categories] = await Promise.all([
    prisma.cookbookPrompt.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * COOKBOOK_PER_PAGE,
      take: COOKBOOK_PER_PAGE,
      select: cookbookListSelect,
    }),
    prisma.cookbookPrompt.count({ where }),
    // Only top-level categories that actually hold published prompts (directly or via a sub-category).
    prisma.cookbookCategory.findMany({
      where: {
        parentId: null,
        OR: [{ prompts: { some: publishedCookbookWhere() } }, { children: { some: { prompts: { some: publishedCookbookWhere() } } } }],
      },
      orderBy: { name: "asc" },
      select: { name: true, slug: true },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / COOKBOOK_PER_PAGE));
  const base = siteUrl();
  const activeCategory = categories.find((c) => c.slug === category);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: activeCategory ? `${activeCategory.name} Prompts` : "Prompt Cookbook",
      description: DESCRIPTION,
      url: `${base}${cookbookHref({ category })}`,
      isPartOf: { "@type": "WebSite", name: "Cuelara", url: base },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: total,
        itemListElement: prompts.map((p, i) => ({
          "@type": "ListItem",
          position: (page - 1) * COOKBOOK_PER_PAGE + i + 1,
          url: `${base}/prompt/${p.slug}`,
          name: p.title,
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: base },
        { "@type": "ListItem", position: 2, name: "Cookbook", item: `${base}/cookbook` },
        ...(activeCategory
          ? [{ "@type": "ListItem", position: 3, name: activeCategory.name, item: `${base}${cookbookHref({ category })}` }]
          : []),
      ],
    },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <section className="relative flex w-full flex-col items-center overflow-hidden border-b border-border/40 pb-12 pt-32 md:pb-16 md:pt-40">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 text-center">
          <h1 className="mb-4 text-4xl font-black tracking-tight text-foreground md:text-5xl">
            {activeCategory ? `${activeCategory.name} Prompts` : "Prompt Cookbook"}
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
            A curated library of production-ready prompts. Search, copy, and deploy highly optimized instructions for any model.
          </p>

          {/* Plain GET form: works without JavaScript and keeps search state in the URL. */}
          <form action="/cookbook" method="get" role="search" className="relative mx-auto max-w-2xl">
            {category && <input type="hidden" name="category" value={category} />}
            <div className="flex items-center rounded-2xl border border-border/60 bg-card p-2 shadow-sm">
              <Search className="ml-4 mr-2 h-5 w-5 text-muted-foreground" aria-hidden />
              <input
                type="search"
                name="q"
                defaultValue={q}
                aria-label="Search prompts"
                placeholder="Search prompts (e.g., 'React', 'SEO', 'Data')..."
                className="flex-1 border-none bg-transparent px-2 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none"
              />
              <button type="submit" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90">
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="container mx-auto grid grid-cols-1 gap-10 px-4 py-12 md:px-8 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-28 md:self-start">
          <div className="md:hidden">
            <CategorySelect categories={categories} active={category} q={q} />
          </div>
          <nav aria-label="Prompt categories" className="hidden flex-col gap-1 md:flex">
            <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Categories</p>
            {[{ name: "All Prompts", slug: undefined }, ...categories].map((c) => {
              const isActive = c.slug === category;
              return (
                <Link
                  key={c.slug ?? "all"}
                  href={cookbookHref({ category: c.slug, q })}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-lg border-l-2 px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  {c.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div>
          {q && (
            <p className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
              {total} result{total === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
              <Link href={cookbookHref({ category })} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                <X className="h-3.5 w-3.5" /> Clear
              </Link>
            </p>
          )}

          {prompts.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {prompts.map((p) => (
                <PromptCard key={p.id} prompt={p} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <p className="mb-2 text-muted-foreground">No prompts found{q ? " matching your search" : ""}.</p>
              <Link href="/cookbook" className="text-sm font-bold text-primary hover:underline">
                Clear filters
              </Link>
            </div>
          )}

          {totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link href={cookbookHref({ category, q, page: page - 1 })} rel="prev" aria-label="Previous page" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <ChevronRight className="h-5 w-5 rotate-180" />
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={cookbookHref({ category, q, page: n })}
                  aria-current={n === page ? "page" : undefined}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                    n === page ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {n}
                </Link>
              ))}
              {page < totalPages && (
                <Link href={cookbookHref({ category, q, page: page + 1 })} rel="next" aria-label="Next page" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <ChevronRight className="h-5 w-5" />
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
