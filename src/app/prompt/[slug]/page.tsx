import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Clock, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { plainTextSummary, siteUrl, formatDate } from "@/lib/blog";
import { publishedCookbookWhere, cookbookListSelect, parseFaqs, type CookbookListData } from "@/lib/cookbook";
import { recordView, getReactionSummary } from "@/lib/engagement";
import { ReactionBar } from "@/components/engagement/ReactionBar";
import { CodeBlock } from "@/components/markdown/CodeBlock";
import { markdownProseClass } from "@/components/markdown/prose";
import { PostImage } from "@/app/blog/PostCard";
import { ShareButtons } from "@/app/blog/[slug]/ShareButtons";
import { PromptCard } from "@/app/cookbook/PromptCard";
import { PromptBox } from "./PromptBox";

export const dynamic = "force-dynamic";

const getPrompt = cache(async (slug: string) =>
  prisma.cookbookPrompt.findFirst({
    where: { AND: [publishedCookbookWhere(), { slug }] },
    include: { category: true },
  })
);

async function getRelatedPrompts(prompt: { id: string; categoryId: string }, limit = 3): Promise<CookbookListData[]> {
  return prisma.cookbookPrompt.findMany({
    where: { AND: [publishedCookbookWhere(), { categoryId: prompt.categoryId }, { id: { not: prompt.id } }] },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: cookbookListSelect,
  });
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const prompt = await getPrompt((await params).slug);
  if (!prompt) return {};

  const url = `${siteUrl()}/prompt/${prompt.slug}`;
  const description = prompt.seoDesc ?? plainTextSummary(prompt.explanation, 160);
  const title = prompt.seoTitle ?? prompt.title;

  return {
    title,
    description,
    keywords: [prompt.category.name, "AI prompt", "prompt template", "ChatGPT prompt", "Claude prompt"],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      siteName: "Cuelara",
      title,
      description,
      publishedTime: prompt.createdAt.toISOString(),
      modifiedTime: prompt.updatedAt.toISOString(),
      section: prompt.category.name,
      images: prompt.image ? [prompt.image] : undefined,
    },
    twitter: { card: prompt.image ? "summary_large_image" : "summary", title, description, images: prompt.image ? [prompt.image] : undefined },
  };
}

export default async function CookbookPromptPage({ params }: { params: Params }) {
  const prompt = await getPrompt((await params).slug);
  if (!prompt) notFound();

  const [related, views, reactions] = await Promise.all([
    getRelatedPrompts(prompt),
    recordView("cookbook", prompt.id),
    getReactionSummary("cookbook", prompt.id),
  ]);
  const url = `${siteUrl()}/prompt/${prompt.slug}`;

  const description = prompt.seoDesc ?? plainTextSummary(prompt.explanation, 160);
  const site = siteUrl();
  const faqs = parseFaqs(prompt.faqs);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: prompt.seoTitle ?? prompt.title,
      name: prompt.title,
      description,
      dateModified: prompt.updatedAt.toISOString(),
      datePublished: prompt.createdAt.toISOString(),
      image: prompt.image ?? undefined,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      articleSection: prompt.category.name,
      inLanguage: "en",
      author: { "@type": "Organization", name: "Cuelara", url: site },
      publisher: { "@type": "Organization", name: "Cuelara", url: site },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site },
        { "@type": "ListItem", position: 2, name: "Cookbook", item: `${site}/cookbook` },
        { "@type": "ListItem", position: 3, name: prompt.category.name, item: `${site}/cookbook?category=${prompt.category.slug}` },
        { "@type": "ListItem", position: 4, name: prompt.title, item: url },
      ],
    },
    ...(faqs.length > 0
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
          },
        ]
      : []),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        // "<" is escaped so prompt content can never close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <article className="container mx-auto max-w-3xl px-4 py-24 md:py-32">
        <Link href="/cookbook" className="mb-8 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to cookbook
        </Link>

        <div className="mb-4">
          <Link
            href={`/cookbook?category=${prompt.category.slug}`}
            className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            {prompt.category.name}
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">{prompt.title}</h1>
          <ReactionBar subject="cookbook" subjectId={prompt.id} initial={reactions} />
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-y border-border py-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" /> {views.toLocaleString()} views
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> Updated <time dateTime={prompt.updatedAt.toISOString()}>{formatDate(prompt.updatedAt)}</time>
            </span>
          </div>
          <ShareButtons url={url} title={prompt.title} />
        </div>

        {prompt.image && <PostImage src={prompt.image} alt={prompt.title} className="mb-10 h-64 w-full rounded-2xl border border-border md:h-80" />}

        <section className={markdownProseClass}>
          <ReactMarkdown components={{ pre: CodeBlock }}>{prompt.explanation}</ReactMarkdown>
        </section>

        <div className="mt-10">
          <h2 className="mb-4 text-xl font-bold text-foreground">Prompt template</h2>
          <PromptBox text={prompt.promptTemplate} />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-xl font-bold text-foreground">Example input</h2>
            <PromptBox text={prompt.exampleInput} />
          </div>
          <div>
            <h2 className="mb-4 text-xl font-bold text-foreground">Example output</h2>
            <PromptBox text={prompt.exampleOutput} />
          </div>
        </div>

        <div className="mt-10">
          <h2 className="mb-4 text-xl font-bold text-foreground">When to use it</h2>
          <div className={markdownProseClass}>
            <ReactMarkdown components={{ pre: CodeBlock }}>{prompt.whenToUse}</ReactMarkdown>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-xl font-bold text-foreground">Best practices</h2>
            <div className={markdownProseClass}>
              <ReactMarkdown components={{ pre: CodeBlock }}>{prompt.bestPractices}</ReactMarkdown>
            </div>
          </div>
          <div>
            <h2 className="mb-4 text-xl font-bold text-foreground">Common mistakes</h2>
            <div className={markdownProseClass}>
              <ReactMarkdown components={{ pre: CodeBlock }}>{prompt.commonMistakes}</ReactMarkdown>
            </div>
          </div>
        </div>

        {prompt.faqs && (
          <div className="mt-10">
            <h2 className="mb-4 text-xl font-bold text-foreground">FAQs</h2>
            <div className={markdownProseClass}>
              <ReactMarkdown components={{ pre: CodeBlock }}>{prompt.faqs}</ReactMarkdown>
            </div>
          </div>
        )}

        <div className="mt-12 rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-sm font-semibold text-foreground">Found this prompt useful? Share it.</p>
          <ShareButtons url={url} title={prompt.title} />
        </div>
      </article>

      {related.length > 0 && (
        <section className="border-t border-border bg-muted/10">
          <div className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
            <h2 className="mb-8 text-2xl font-bold tracking-tight text-foreground md:text-3xl">More in {prompt.category?.name ?? "this category"}</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <PromptCard key={r.id} prompt={r} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
