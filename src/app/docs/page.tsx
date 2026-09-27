import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Terminal, Code2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Docs — Cuelara",
  description: "Reference and setup guides for using Cuelara outside the website — MCP server, API, and more.",
};

const SECTIONS = [
  {
    href: "/docs/mcp",
    icon: Terminal,
    title: "MCP Server",
    description: "Call the Token Optimizer directly from Claude Desktop, Claude Code, Cursor, Copilot, Gemini CLI, Antigravity, and any other MCP client.",
  },
  {
    href: "/docs/api",
    icon: Code2,
    title: "REST API",
    description: "Call Cuelara's tools as plain JSON HTTP endpoints from your own server or app — same bearer token as MCP, no client library needed.",
  },
];

export default function Page() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-24 md:py-32">
      <div className="mb-10 flex items-center gap-3">
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary shrink-0">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Docs</h1>
          <p className="text-sm text-muted-foreground">Reference and setup guides for using Cuelara outside the website.</p>
        </div>
      </div>

      <div className="space-y-3">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm"
          >
            <div className="rounded-xl border border-border bg-muted/40 p-2.5 text-muted-foreground shrink-0 group-hover:text-primary">
              <section.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-foreground">{section.title}</div>
              <div className="text-sm text-muted-foreground">{section.description}</div>
            </div>
            <ArrowRight className="ml-auto h-5 w-5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </article>
  );
}
