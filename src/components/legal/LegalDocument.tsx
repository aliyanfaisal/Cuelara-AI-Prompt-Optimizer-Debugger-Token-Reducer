import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft } from "lucide-react";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** A long-form page (privacy policy, terms) written in Markdown, with a table of contents built from its "## " headings. */
export function LegalDocument({ title, updated, intro, markdown }: { title: string; updated: string; intro: string; markdown: string }) {
  const headings = [...markdown.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());

  return (
    <article className="container mx-auto max-w-3xl px-4 py-24 md:py-32">
      <Link href="/" className="mb-8 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to home
      </Link>

      <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">{title}</h1>
      <p className="mb-6 text-sm text-muted-foreground">Last updated: {updated}</p>
      <p className="mb-10 text-lg leading-relaxed text-muted-foreground">{intro}</p>

      <nav aria-label="Contents" className="mb-12 rounded-2xl border border-border bg-card p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">On this page</p>
        <ol className="grid list-decimal gap-x-8 gap-y-1.5 pl-5 text-sm sm:grid-cols-2">
          {headings.map((h) => (
            <li key={h}>
              <a href={`#${slugify(h)}`} className="text-foreground/90 hover:text-primary hover:underline">
                {h.replace(/^\d+\.\s*/, "")}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-4 leading-relaxed text-foreground/90 [&_a]:text-primary [&_a]:underline [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-foreground [&_li]:mt-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-6">
        <ReactMarkdown
          components={{
            h2: ({ children }) => {
              const text = String(children);
              return (
                <h2 id={slugify(text)} className="mt-12 scroll-mt-24 border-t border-border pt-8 text-2xl font-bold text-foreground">
                  {children}
                </h2>
              );
            },
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </article>
  );
}
