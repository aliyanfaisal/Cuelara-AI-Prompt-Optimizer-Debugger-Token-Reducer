import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, WandSparkles } from "lucide-react";
import { siteUrl } from "@/lib/blog";
import { CodeBlock } from "@/components/markdown/CodeBlock";
import { markdownProseClass } from "@/components/markdown/prose";

export const metadata: Metadata = {
  title: "Prompt Builder API — Cuelara",
  description: "POST /api/v1/build-prompt — build a ready-to-paste prompt for a specific target model as a plain JSON REST endpoint, from your own server or app.",
};

function content(base: string): string {
  return `**\`POST /api/v1/build-prompt\`** turns a rough idea into a complete, ready-to-paste prompt for a specific target model — clear and lean, grounded only in what the idea actually says, with bracketed placeholders for anything genuinely missing.

## Request

\`\`\`bash
curl -X POST ${base}/api/v1/build-prompt \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -d '{
    "idea": "a chatbot that answers questions about our docs",
    "target": "Claude",
    "useCase": "Coding"
  }'
\`\`\`

The \`Authorization\` header is optional — omit it to call anonymously (lower rate limit). Get a token from [/dashboard/mcp](/dashboard/mcp).

## Body

- \`idea\` (string, required) — the rough idea to turn into a prompt (max 4,000 characters).
- \`target\` (string, optional) — \`"Any AI model"\` (default), \`"ChatGPT"\`, \`"Claude"\`, \`"Gemini"\`, \`"Grok"\`, \`"DeepSeek"\`, \`"Cursor / Windsurf"\`, or \`"GitHub Copilot"\`.
- \`useCase\` (string, optional) — \`"General"\` (default), \`"Coding"\`, \`"Writing"\`, \`"Marketing"\`, \`"Business"\`, or \`"Research"\`.
- \`detail\` (string, optional) — \`"Concise"\`, \`"Balanced"\` (default), or \`"Detailed"\`.

## Response

\`\`\`json
{ "prompt": "<role>\\nYou are a chatbot that answers questions about our documentation.\\n</role>\\n\\n..." }
\`\`\`

## Errors

\`400\` invalid body, \`401\` invalid token, \`429\` rate limit, \`502\`/\`503\`/\`504\` upstream AI failure — each returns \`{ "error": "..." }\`.

## Limits

Anonymous calls share the same free daily limit as the website's Prompt Builder, keyed by IP. Signed-in calls use your own account's plan limits instead. See the [API overview](/docs/api) for auth and CORS details.
`;
}

export default function Page() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-24 md:py-32">
      <Link href="/docs/api" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> API overview
      </Link>
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-2.5 text-orange-500 shrink-0">
          <WandSparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Prompt Builder</h1>
          <p className="text-sm text-muted-foreground">Build ready-to-paste prompts via a plain REST endpoint.</p>
        </div>
      </div>
      <div className={markdownProseClass}>
        <ReactMarkdown components={{ pre: CodeBlock }}>{content(siteUrl())}</ReactMarkdown>
      </div>
    </article>
  );
}
