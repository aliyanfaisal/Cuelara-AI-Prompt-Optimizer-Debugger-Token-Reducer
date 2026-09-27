import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Code2 } from "lucide-react";
import { siteUrl } from "@/lib/blog";
import { CodeBlock } from "@/components/markdown/CodeBlock";
import { markdownProseClass } from "@/components/markdown/prose";

export const metadata: Metadata = {
  title: "Prompt Optimizer API — Cuelara",
  description: "POST /api/v1/optimize-prompt — turn a rough idea into a structured prompt as a plain JSON REST endpoint, from your own server or app.",
};

function content(base: string): string {
  return `**\`POST /api/v1/optimize-prompt\`** turns a rough, messy request into a complete, structured, ready-to-paste prompt — adds role anchoring, explicit steps, negative constraints, and an output format tailored to the mode you pick.

## Request

\`\`\`bash
curl -X POST ${base}/api/v1/optimize-prompt \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -d '{
    "text": "build me a login page",
    "mode": "Coding",
    "level": "Detailed"
  }'
\`\`\`

The \`Authorization\` header is optional — omit it to call anonymously (lower rate limit, output includes an "Optimized by Cuelara.com" line). Get a token from [/dashboard/mcp](/dashboard/mcp).

## Body

- \`text\` (string, required) — the rough idea or request to turn into a full prompt.
- \`mode\` (string, optional) — \`"General"\` (default), \`"Coding"\`, \`"Writing"\`, \`"Business"\`, or \`"Research"\`.
- \`level\` (string, optional) — \`"Concise"\`, \`"Balanced"\` (default), \`"Detailed"\`, or \`"Comprehensive"\`.

## Response

\`\`\`json
{ "optimized": "### ROLE\\nYou are a Senior Frontend Engineer...\\n\\n### TASK\\n..." }
\`\`\`

## Errors

\`400\` invalid body, \`401\` invalid token, \`429\` rate limit, \`502\`/\`503\`/\`504\` upstream AI failure — each returns \`{ "error": "..." }\`.

## Limits

Anonymous calls share the same free daily limit as the website's Prompt Optimizer, keyed by IP. Signed-in calls use your own account's plan limits instead. See the [API overview](/docs/api) for auth and CORS details.
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
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Prompt Optimizer</h1>
          <p className="text-sm text-muted-foreground">Structure rough ideas via a plain REST endpoint.</p>
        </div>
      </div>
      <div className={markdownProseClass}>
        <ReactMarkdown components={{ pre: CodeBlock }}>{content(siteUrl())}</ReactMarkdown>
      </div>
    </article>
  );
}
