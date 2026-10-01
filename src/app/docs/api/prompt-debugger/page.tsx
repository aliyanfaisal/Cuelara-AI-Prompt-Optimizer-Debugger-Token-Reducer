import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Code2 } from "lucide-react";
import { siteUrl } from "@/lib/blog";
import { CodeBlock } from "@/components/markdown/CodeBlock";
import { markdownProseClass } from "@/components/markdown/prose";

export const metadata: Metadata = {
  title: "Prompt Debugger API — Cuelara",
  description: "POST /api/v1/debug-prompt — audit a prompt for silent-failure weaknesses and optionally get it rewritten with the fixes applied.",
};

function content(base: string): string {
  return `**\`POST /api/v1/debug-prompt\`** audits a prompt for weaknesses that make an LLM fail silently — contradictions, unbounded scope, missing output format, ambiguity — and can rewrite the prompt with every fix applied.

## Request

\`\`\`bash
curl -X POST ${base}/api/v1/debug-prompt \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -d '{
    "text": "Summarize this article. Keep it short but include every detail.",
    "level": "High",
    "focus": "Logic Loopholes",
    "applyFixes": true
  }'
\`\`\`

The \`Authorization\` header is optional — omit it to call anonymously (lower rate limit). Get a token from [/dashboard/mcp](/dashboard/mcp).

## Body

- \`text\` (string, required, up to 20,000 characters) — the prompt to audit.
- \`level\` (string, optional) — strictness: \`"Standard"\` (default), \`"High"\`, or \`"Paranoid"\`.
- \`focus\` (string, optional) — \`"All Vulnerabilities"\` (default), \`"Logic Loopholes"\`, \`"Edge-cases"\`, or \`"Bias & Tone"\`.
- \`applyFixes\` (boolean, optional) — also return the prompt rewritten with every suggested fix applied. It counts as a single use.

## Response

\`\`\`json
{
  "issues": [
    {
      "id": "conflicting-length",
      "severity": "critical",
      "title": "Contradictory length requirement",
      "explanation": "\\"Short\\" and \\"every detail\\" can't both be satisfied.",
      "fix": "State a maximum length and which details take priority."
    }
  ],
  "passedChecks": [{ "title": "Output format", "detail": "The expected output is clearly a summary." }],
  "fixed": "Summarize this article in under 150 words, prioritising..."
}
\`\`\`

\`severity\` is \`"critical"\` or \`"warning"\`. \`fixed\` is only present when \`applyFixes\` is \`true\`; if there were no issues, it is your original prompt unchanged.

## Errors

\`400\` invalid body, \`401\` invalid token, \`429\` rate limit, \`502\`/\`503\`/\`504\` upstream AI failure — each returns \`{ "error": "..." }\`.

## Limits

Anonymous calls share the same free daily limit as the website's Prompt Debugger, keyed by IP. Signed-in calls use your own account's plan limits instead. See the [API overview](/docs/api) for auth and CORS details.
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
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Prompt Debugger</h1>
          <p className="text-sm text-muted-foreground">Audit prompts for weaknesses via a plain REST endpoint.</p>
        </div>
      </div>
      <div className={markdownProseClass}>
        <ReactMarkdown components={{ pre: CodeBlock }}>{content(siteUrl())}</ReactMarkdown>
      </div>
    </article>
  );
}
