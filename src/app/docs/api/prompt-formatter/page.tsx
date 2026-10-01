import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Code2 } from "lucide-react";
import { siteUrl } from "@/lib/blog";
import { CodeBlock } from "@/components/markdown/CodeBlock";
import { markdownProseClass } from "@/components/markdown/prose";

export const metadata: Metadata = {
  title: "Prompt Formatter API — Cuelara",
  description: "POST /api/v1/format-prompt — reorganize a messy prompt into clean Markdown, XML or JSON sections as a plain JSON REST endpoint.",
};

function content(base: string): string {
  return `**\`POST /api/v1/format-prompt\`** reorganizes a messy, unstructured prompt into clean semantic sections — a system role, the task, constraints, and the expected output format — without adding or dropping any of your actual instructions.

## Request

\`\`\`bash
curl -X POST ${base}/api/v1/format-prompt \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -d '{
    "text": "write a blog post about coffee, friendly tone, under 500 words, no emojis",
    "format": "Markdown (Standard)",
    "indent": "2 Spaces"
  }'
\`\`\`

The \`Authorization\` header is optional — omit it to call anonymously (lower rate limit). Get a token from [/dashboard/mcp](/dashboard/mcp).

## Body

- \`text\` (string, required, up to 20,000 characters) — the prompt to reorganize.
- \`format\` (string, optional) — \`"Markdown (Standard)"\` (default), \`"XML (Claude-Optimized)"\`, or \`"JSON (API Ready)"\`.
- \`indent\` (string, optional) — \`"2 Spaces"\` (default), \`"4 Spaces"\`, or \`"Tabs"\`. Only applies to the JSON format.

## Response

\`\`\`json
{ "formatted": "### System Role\\nYou are a friendly blog writer...\\n\\n### Task\\n..." }
\`\`\`

## Errors

\`400\` invalid body, \`401\` invalid token, \`429\` rate limit, \`502\`/\`503\`/\`504\` upstream AI failure — each returns \`{ "error": "..." }\`.

## Limits

Anonymous calls share the same free daily limit as the website's Prompt Formatter, keyed by IP. Signed-in calls use your own account's plan limits instead. See the [API overview](/docs/api) for auth and CORS details.
`;
}

export default function Page() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-24 md:py-32">
      <Link href="/docs/api" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> API overview
      </Link>
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary shrink-0">
          <Code2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Prompt Formatter</h1>
          <p className="text-sm text-muted-foreground">Clean up messy prompts via a plain REST endpoint.</p>
        </div>
      </div>
      <div className={markdownProseClass}>
        <ReactMarkdown components={{ pre: CodeBlock }}>{content(siteUrl())}</ReactMarkdown>
      </div>
    </article>
  );
}
