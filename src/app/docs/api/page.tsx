import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, ArrowRight, Code2, Zap, WandSparkles } from "lucide-react";
import { siteUrl } from "@/lib/blog";
import { CodeBlock } from "@/components/markdown/CodeBlock";
import { markdownProseClass } from "@/components/markdown/prose";

export const metadata: Metadata = {
  title: "REST API — Cuelara",
  description: "Call Cuelara's tools as plain JSON HTTP endpoints from your own server or app — same bearer token as the MCP server, no client library needed.",
};

const TOOLS = [
  { slug: "token-optimizer", name: "Token Optimizer", endpoint: "POST /api/v1/compress-prompt", description: "Compress verbose prompts, verified against a real tokenizer.", icon: Zap, iconClassName: "text-amber-500" },
  { slug: "prompt-optimizer", name: "Prompt Optimizer", endpoint: "POST /api/v1/optimize-prompt", description: "Turn a rough idea into a complete, structured prompt.", icon: Code2, iconClassName: "text-primary" },
  { slug: "prompt-builder", name: "Prompt Builder", endpoint: "POST /api/v1/build-prompt", description: "Build a ready-to-paste prompt for a specific target model.", icon: WandSparkles, iconClassName: "text-orange-500" },
];

function content(base: string): string {
  return `Every Cuelara tool below is also a plain **REST endpoint** — regular JSON over HTTP. No MCP client, no SDK, no special protocol: call it from any backend (Node, Python, PHP, Ruby, whatever) or directly from your own app, the same way you'd call any other API.

This is the same underlying service as the [MCP server](/docs/mcp) — same auth, same rate limits, same tools — just a plain request/response shape instead of JSON-RPC, for when you're integrating from code rather than from an AI assistant.

## Authentication

Without a token, calls are anonymous — rate-limited by IP, same as a visitor to the website, and the output gets a "by Cuelara.com" line appended.

Generate a personal token from [/dashboard/mcp](/dashboard/mcp) (the same tokens work for both the API and MCP) and send it as a bearer token:

\`\`\`bash
curl -X POST ${base}/api/v1/compress-prompt \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -d '{"text": "Could you please help me write a Python script that..."}'
\`\`\`

Signed-in calls use your own account's daily limit, and paid-plan output skips the attribution line.

## CORS

Every endpoint sends permissive CORS headers, so you can call it directly from client-side JavaScript too — not just server-to-server. Just be aware a token sent from the browser is visible to anyone inspecting the request; for production use, calling it from your own backend and keeping the token server-side is safer.

## Errors

Every endpoint returns \`{ "error": "..." }\` with a matching HTTP status: \`400\` for bad input, \`401\` for an invalid token, \`429\` for a rate limit, \`502\`/\`503\`/\`504\` for upstream AI failures.

## Limits

Anonymous calls share the same free daily limit as the matching web tool, keyed by IP. Signed-in calls (via a personal token from [/dashboard/mcp](/dashboard/mcp)) use your own account's plan limits instead.
`;
}

export default function Page() {
  const base = siteUrl();

  return (
    <article className="container mx-auto max-w-3xl px-4 py-24 md:py-32">
      <Link href="/docs" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All docs
      </Link>
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary shrink-0">
          <Code2 className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">REST API</h1>
      </div>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Endpoints</h2>
      <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link
            key={tool.slug}
            href={`/docs/api/${tool.slug}`}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
          >
            <div className="rounded-lg border border-border bg-muted/40 p-2 shrink-0">
              <tool.icon className={`h-4 w-4 ${tool.iconClassName}`} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">{tool.name}</div>
              <div className="truncate text-xs text-muted-foreground">{tool.description}</div>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </div>

      <div className={markdownProseClass}>
        <ReactMarkdown components={{ pre: CodeBlock }}>{content(base)}</ReactMarkdown>
      </div>
    </article>
  );
}
