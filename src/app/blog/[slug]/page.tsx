import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Drafts and future-dated posts are never public.
const getPost = cache(async (slug: string) =>
  prisma.blogPost.findFirst({
    where: { slug, status: "published", publishedAt: { lte: new Date() } },
    include: { categories: true, tags: true },
  })
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return {};

  return {
    title: post.seoTitle ?? post.title,
    description: post.seoDesc ?? post.excerpt ?? undefined,
    alternates: { canonical: post.canonicalUrl ?? undefined },
    openGraph: post.imageUrl ? { images: [post.imageUrl] } : undefined,
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  if (!post) notFound();

  return (
    <article className="container mx-auto max-w-3xl px-4 py-24 md:py-32">
      <Link href="/blog" className="mb-8 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to blog
      </Link>

      {post.categories.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {post.categories.map((c) => (
            <span key={c.id} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {c.name}
            </span>
          ))}
        </div>
      )}

      <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">{post.title}</h1>
      {post.publishedAt && (
        <time dateTime={post.publishedAt.toISOString()} className="mb-8 block text-sm text-muted-foreground">
          {post.publishedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </time>
      )}

      {post.imageUrl && (
        // Hotlinked from the publishing site on purpose — the image is not re-hosted here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.imageUrl} alt="" referrerPolicy="no-referrer" className="mb-10 w-full rounded-2xl border border-border" />
      )}

      {/* react-markdown escapes raw HTML by default and strips unsafe URLs (e.g. javascript:), so the body is never rendered as raw HTML. */}
      <div className="space-y-4 leading-relaxed text-foreground/90 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-bold [&_img]:rounded-xl [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-4 [&_pre_code]:bg-transparent [&_ul]:list-disc [&_ul]:pl-6">
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </div>

      {post.tags.length > 0 && (
        <div className="mt-12 flex flex-wrap gap-2 border-t border-border pt-6">
          {post.tags.map((t) => (
            <span key={t.id} className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              #{t.name}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
