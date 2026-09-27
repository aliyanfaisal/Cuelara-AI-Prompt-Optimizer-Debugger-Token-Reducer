import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Code2 } from "lucide-react";
import { siteUrl } from "@/lib/blog";
import { CodeBlock } from "@/components/markdown/CodeBlock";
import { markdownProseClass } from "@/components/markdown/prose";
import { mcpSetupPrompt } from "@/lib/docs/mcp-setup-prompt";

export const metadata: Metadata = {
  title: "Prompt Optimizer MCP Tool — Cuelara",
  description: "Call Cuelara's Prompt Optimizer as an MCP tool (cuelara_optimize_prompt) from Claude Desktop, Claude Code, Cursor, or any MCP client.",
};

function content(base: string): string {
  return `**\`cuelara_optimize_prompt\`** turns a rough, messy request into a complete, structured, ready-to-paste prompt — adds role anchoring, explicit steps, negative constraints, and an output format tailored to the mode you pick.

## Set it up automatically

Paste this into the AI assistant you already have open — VS Code's Claude extension, Copilot Chat, Cursor, Claude Code, whatever it is — and it will ask you what it needs, then write the config file itself:

\`\`\`text
${mcpSetupPrompt(base)}
\`\`\`

## Fastest manual setup — Claude Code

\`\`\`bash
claude mcp add --transport http cuelara-token-optimizer ${base}/api/mcp
\`\`\`

That's the whole server, so \`cuelara_compress_prompt\` (Token Optimizer) comes along too. For other clients — Claude Desktop, Cursor, Copilot, Gemini CLI, Antigravity — see the [client setup guides](/docs/mcp).

## Arguments

- \`text\` (string, required) — the rough idea or request to turn into a full prompt.
- \`mode\` (string, optional) — \`"General"\` (default), \`"Coding"\`, \`"Writing"\`, \`"Business"\`, or \`"Research"\`.
- \`level\` (string, optional) — \`"Concise"\`, \`"Balanced"\` (default), \`"Detailed"\`, or \`"Comprehensive"\`.

## Call it directly

\`\`\`bash
curl -X POST ${base}/api/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "cuelara_optimize_prompt",
      "arguments": { "text": "build me a login page", "mode": "Coding", "level": "Detailed" }
    }
  }'
\`\`\`

Add \`-H "Authorization: Bearer YOUR_TOKEN_HERE"\` (a personal token from [/dashboard/mcp](/dashboard/mcp)) to authenticate as yourself instead of anonymously — your own plan's daily limit applies, and paid-plan output skips the "Optimized by Cuelara.com" attribution.

## Limits

Anonymous calls share the same free daily limit as the website's Prompt Optimizer, keyed by IP. Signed-in calls use your own account's plan limits instead.
`;
}

export default function Page() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-24 md:py-32">
      <Link href="/docs/mcp" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> MCP overview
      </Link>
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary shrink-0">
          <Code2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Prompt Optimizer</h1>
          <p className="text-sm text-muted-foreground">Structure rough ideas into full prompts from any MCP client.</p>
        </div>
      </div>
      <div className={markdownProseClass}>
        <ReactMarkdown components={{ pre: CodeBlock }}>{content(siteUrl())}</ReactMarkdown>
      </div>
    </article>
  );
}
