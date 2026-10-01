import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Zap } from "lucide-react";
import { siteUrl } from "@/lib/blog";
import { CodeBlock } from "@/components/markdown/CodeBlock";
import { markdownProseClass } from "@/components/markdown/prose";

export const metadata: Metadata = {
  title: "Token Optimizer API — Cuelara",
  description: "POST /api/v1/compress-prompt — compress verbose prompts as a plain JSON REST endpoint, from your own server or app.",
};

function content(base: string): string {
  return `**\`POST /api/v1/compress-prompt\`** compresses a prompt to use fewer tokens while preserving every instruction and constraint, verified against a real tokenizer — not an estimate.

## Request

\`\`\`bash
curl -X POST ${base}/api/v1/compress-prompt \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -d '{
    "text": "Could you please help me write a Python script that...",
    "level": "Aggressive (Max Savings)"
  }'
\`\`\`

The \`Authorization\` header is optional — omit it to call anonymously (lower rate limit). Get a token from [/dashboard/mcp](/dashboard/mcp).

## Body

- \`text\` (string, required) — the prompt to compress.
- \`level\` (string, optional) — \`"Low (Safest)"\`, \`"Medium (Balanced)"\` (default), or \`"Aggressive (Max Savings)"\`.
- \`preserveFormatting\` (string, optional) — \`"Yes"\` (default) or \`"No"\`.

## Response

\`\`\`json
{
  "compressed": "Compress this prompt. Keep all instructions and constraints intact.",
  "originalTokens": 61,
  "compressedTokens": 12,
  "savedPercent": 80
}
\`\`\`

## Errors

\`\`\`json
{ "error": "Daily compression limit reached (5/day for this caller). Try again tomorrow, or sign in at cuelara.com for a higher limit." }
\`\`\`

\`400\` invalid body, \`401\` invalid token, \`429\` rate limit, \`502\`/\`503\`/\`504\` upstream AI failure.

## Limits

Anonymous calls share the same free daily limit as the website's Token Optimizer, keyed by IP. Signed-in calls use your own account's plan limits instead. See the [API overview](/docs/api) for auth and CORS details.
`;
}

export default function Page() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-24 md:py-32">
      <Link href="/docs/api" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> API overview
      </Link>
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-amber-500 shrink-0">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Token Optimizer</h1>
          <p className="text-sm text-muted-foreground">Compress prompts via a plain REST endpoint.</p>
        </div>
      </div>
      <div className={markdownProseClass}>
        <ReactMarkdown components={{ pre: CodeBlock }}>{content(siteUrl())}</ReactMarkdown>
      </div>
    </article>
  );
}
