import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate, postCardSelect, publishedWhere, readingTimeMinutes, siteUrl, teaser, type PostCardData } from "@/lib/blog";
import { PostCard, PostImage } from "../PostCard";
import { CodeBlock } from "@/components/markdown/CodeBlock";
import { ShareButtons } from "./ShareButtons";

export const dynamic = "force-dynamic";

const getPost = cache(async (slug: string) =>
  prisma.blogPost.findFirst({
    where: { AND: [publishedWhere(), { slug }] },
    include: { categories: true, tags: true },
  })
);

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return {};

  const url = `${siteUrl()}/blog/${post.slug}`;
  const description = post.seoDesc ?? teaser(post, 160);
  const title = post.seoTitle ?? post.title;

  return {
    title,
    description,
    alternates: { canonical: post.canonicalUrl ?? url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      publishedTime: post.publishedAt?.toISOString(),
      images: post.imageUrl ? [post.imageUrl] : undefined,
    },
    twitter: { card: post.imageUrl ? "summary_large_image" : "summary", title, description, images: post.imageUrl ? [post.imageUrl] : undefined },
  };
}

// Posts sharing the most categories (weighted higher) and tags come first; recent posts fill any gap.
async function getRelatedPosts(post: { id: string; categories: { id: string }[]; tags: { id: string }[] }, limit = 3): Promise<PostCardData[]> {
  const categoryIds = new Set(post.categories.map((c) => c.id));
  const tagIds = new Set(post.tags.map((t) => t.id));
  const base = { AND: [publishedWhere(), { id: { not: post.id } }] };

  let related: PostCardData[] = [];
  if (categoryIds.size + tagIds.size > 0) {
    const candidates = await prisma.blogPost.findMany({
      where: {
        AND: [
          ...base.AND,
          { OR: [{ categories: { some: { id: { in: [...categoryIds] } } } }, { tags: { some: { id: { in: [...tagIds] } } } }] },
        ],
      },
      orderBy: { publishedAt: "desc" },
      take: 30,
      select: { ...postCardSelect, categories: { select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } }, tags: { select: { id: true } } },
    });
    const score = (c: (typeof candidates)[number]) =>
      c.categories.filter((x) => categoryIds.has(x.id)).length * 2 + c.tags.filter((x) => tagIds.has(x.id)).length;
    related = candidates.sort((a, b) => score(b) - score(a)).slice(0, limit);
  }

  if (related.length < limit) {
    const fill = await prisma.blogPost.findMany({
      where: { AND: [...base.AND, { id: { notIn: related.map((r) => r.id) } }] },
      orderBy: { publishedAt: "desc" },
      take: limit - related.length,
      select: postCardSelect,
    });
    related = [...related, ...fill];
  }
  return related;
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const post = await getPost((await params).slug);
  if (!post) notFound();

  const related = await getRelatedPosts(post);
  const url = `${siteUrl()}/blog/${post.slug}`;
  const minutes = readingTimeMinutes(post.content);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seoDesc ?? teaser(post, 160),
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    image: post.imageUrl ?? undefined,
    mainEntityOfPage: post.canonicalUrl ?? url,
    keywords: post.tags.map((t) => t.name).join(", ") || undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        // "<" is escaped so post content can never close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <article className="container mx-auto max-w-3xl px-4 py-24 md:py-32">
        <Link href="/blog" className="mb-8 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to blog
        </Link>

        {post.categories.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {post.categories.map((c) => (
              <Link
                key={c.id}
                href={`/blog?category=${c.slug}`}
                className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}

        <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">{post.title}</h1>
        {post.excerpt && <p className="mb-6 text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>}

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-y border-border py-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {post.publishedAt && (
              <time dateTime={post.publishedAt.toISOString()} className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> {formatDate(post.publishedAt)}
              </time>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {minutes} min read
            </span>
          </div>
          <ShareButtons url={url} title={post.title} />
        </div>

        {post.imageUrl && <PostImage src={post.imageUrl} alt="" className="mb-10 w-full rounded-2xl border border-border" />}

        {/* react-markdown escapes raw HTML by default and strips unsafe URLs (e.g. javascript:), so the body is never rendered as raw HTML. */}
        <div className="space-y-4 leading-relaxed text-foreground/90 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-bold [&_img]:rounded-xl [&_ol]:list-decimal [&_ol]:pl-6 [&_pre_code]:rounded-none [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:list-disc [&_ul]:pl-6">
          <ReactMarkdown components={{ pre: CodeBlock }}>{post.content}</ReactMarkdown>
        </div>

        {post.tags.length > 0 && (
          <div className="mt-12 flex flex-wrap gap-2 border-t border-border pt-6">
            {post.tags.map((t) => (
              <Link
                key={t.id}
                href={`/blog?tag=${t.slug}`}
                className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              >
                #{t.name}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-sm font-semibold text-foreground">Found this useful? Share it.</p>
          <ShareButtons url={url} title={post.title} />
        </div>
      </article>

      {related.length > 0 && (
        <section className="border-t border-border bg-muted/10">
          <div className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
            <h2 className="mb-8 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Related posts</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <PostCard key={r.id} post={r} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
