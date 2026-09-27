import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { plainTextSummary } from "@/lib/blog";
import type { CookbookListData } from "@/lib/cookbook";

export function PromptCard({ prompt }: { prompt: CookbookListData }) {
  return (
    <Link
      href={`/prompt/${prompt.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-lg"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative z-10 flex h-full flex-col p-6">
        <div className="mb-4 flex items-start justify-between">
          <span className="rounded-md border border-border/50 bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {prompt.category.name}
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
            <ArrowRight className="h-4 w-4 -rotate-45 transition-transform group-hover:rotate-0" />
          </span>
        </div>
        <h2 className="mb-2 text-lg font-bold leading-tight text-foreground">{prompt.title}</h2>
        <p className="mb-6 line-clamp-2 text-sm text-muted-foreground">{plainTextSummary(prompt.explanation, 140)}</p>
        <div className="relative mt-auto overflow-hidden rounded-xl border border-border/50 bg-muted/40 p-4">
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-muted/90" />
          <pre className="line-clamp-4 whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">{prompt.promptTemplate}</pre>
        </div>
      </div>
    </Link>
  );
}
