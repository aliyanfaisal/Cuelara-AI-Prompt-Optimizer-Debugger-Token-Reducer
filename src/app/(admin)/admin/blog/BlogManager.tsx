"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, ExternalLink, EyeOff, FileEdit, Globe, RefreshCw, Search, Trash2 } from "lucide-react";
import type { PostState } from "@/lib/blog";
import { deleteBlogPost, setBlogPostStatus } from "./actions";

export interface AdminBlogPost {
  id: string;
  title: string;
  slug: string;
  state: PostState;
  publishedAt: string | null;
  updatedAt: string;
  externalId: number | null;
  readingMinutes: number;
  categories: string[];
}

const STATE_STYLES: Record<PostState, { label: string; className: string }> = {
  live: { label: "Live", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  scheduled: { label: "Scheduled", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
};

const FILTERS: { key: PostState | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "scheduled", label: "Scheduled" },
  { key: "draft", label: "Drafts" },
];

const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

export default function BlogManager({ posts, lastSyncedAt }: { posts: AdminBlogPost[]; lastSyncedAt: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<PostState | "all">("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c = { all: posts.length, live: 0, scheduled: 0, draft: 0 };
    for (const p of posts) c[p.state]++;
    return c;
  }, [posts]);

  const visible = posts.filter(
    (p) => (filter === "all" || p.state === filter) && p.title.toLowerCase().includes(query.trim().toLowerCase())
  );

  function run(action: () => Promise<{ error?: string; success?: boolean }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) alert(result.error);
      else router.refresh();
    });
  }

  function handleDelete(post: AdminBlogPost) {
    const warning = post.externalId !== null ? "\n\nThis post is synced from the portfolio site and will be recreated the next time it is pushed from there." : "";
    if (confirm(`Delete "${post.title}"? This cannot be undone.${warning}`)) run(() => deleteBlogPost(post.id));
  }

  const stats = [
    { name: "Total posts", value: counts.all, icon: FileEdit, color: "text-blue-500", bg: "bg-blue-500/10" },
    { name: "Live", value: counts.live, icon: Globe, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { name: "Drafts & scheduled", value: counts.draft + counts.scheduled, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
    { name: "Last sync", value: lastSyncedAt ? date(lastSyncedAt) : "Never", icon: RefreshCw, color: "text-violet-500", bg: "bg-violet-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.name} className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg ${s.bg}`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{s.name}</p>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-4 text-sm text-muted-foreground flex items-start gap-3">
        <RefreshCw className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
        <p>
          Posts arrive from the portfolio site via <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-xs">POST /api/blog-posts</code>. The portfolio is the
          source of truth: a status change made here on a synced post is overwritten by that post&apos;s next sync.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.label} <span className="opacity-70">{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title"
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className={`space-y-3 transition-opacity ${isPending ? "opacity-60" : ""}`}>
        {visible.length === 0 && (
          <div className="border border-dashed border-border rounded-xl py-16 text-center text-muted-foreground">
            {posts.length === 0 ? "No posts yet. They will appear here once the portfolio site pushes its first post." : "No posts match this filter."}
          </div>
        )}

        {visible.map((post) => {
          const style = STATE_STYLES[post.state];
          return (
            <div key={post.id} className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center gap-4 hover:shadow-md transition-all">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${style.className}`}>{style.label}</span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {post.externalId !== null ? `Portfolio #${post.externalId}` : "Local"}
                  </span>
                  {post.categories.map((c) => (
                    <span key={c} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {c}
                    </span>
                  ))}
                </div>
                <h3 className="font-bold text-foreground truncate">{post.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  /blog/{post.slug} · {post.state === "scheduled" ? "Goes live" : "Published"} {date(post.publishedAt)} · Updated {date(post.updatedAt)} · {post.readingMinutes} min read
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {post.state === "live" ? (
                  <a
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" /> View
                  </a>
                ) : null}

                {post.state === "live" || post.state === "scheduled" ? (
                  <button
                    disabled={isPending}
                    onClick={() => run(() => setBlogPostStatus(post.id, "draft"))}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <EyeOff className="w-4 h-4" /> Unpublish
                  </button>
                ) : (
                  <button
                    disabled={isPending}
                    onClick={() => run(() => setBlogPostStatus(post.id, "published"))}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Publish
                  </button>
                )}

                <button
                  disabled={isPending}
                  onClick={() => handleDelete(post)}
                  className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete post"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
