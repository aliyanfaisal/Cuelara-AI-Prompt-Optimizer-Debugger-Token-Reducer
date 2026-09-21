import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { cardSummary, formatDate, type PostCardData } from "@/lib/blog";

export function PostImage({ src, alt, className = "" }: { src: string | null; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-primary/15 via-violet-500/10 to-accent/15 ${className}`}>
        <FileText className="h-10 w-10 text-primary/40" />
      </div>
    );
  }
  // Hotlinked from the publishing site on purpose; the image is not re-hosted here.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" className={`object-cover ${className}`} />;
}

export function PostCard({ post }: { post: PostCardData }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative h-48 w-full overflow-hidden bg-muted">
        <PostImage src={post.imageUrl} alt={post.title} className="h-full w-full transition-transform duration-700 group-hover:scale-105" />
        {post.categories[0] && (
          <span className="absolute left-4 top-4 rounded-md bg-background/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground shadow-sm backdrop-blur-sm">
            {post.categories[0].name}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
          <span>{post.publishedAt ? formatDate(post.publishedAt) : ""}</span>
          <span>{post.readingMinutes} min read</span>
        </div>
        <h3 className="mb-3 line-clamp-2 text-xl font-bold leading-tight text-foreground transition-colors group-hover:text-primary">{post.title}</h3>
        <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{cardSummary(post)}</p>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-xs font-bold text-primary">Read Post</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted transition-all duration-300 group-hover:translate-x-1 group-hover:bg-primary group-hover:text-primary-foreground">
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}
