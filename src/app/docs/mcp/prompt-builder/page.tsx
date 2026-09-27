import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, WandSparkles } from "lucide-react";
import { siteUrl } from "@/lib/blog";
import { CodeBlock } from "@/components/markdown/CodeBlock";
import { markdownProseClass } from "@/components/markdown/prose";
import { mcpSetupPrompt } from "@/lib/docs/mcp-setup-prompt";

export const metadata: Metadata = {
  title: "Prompt Builder MCP Tool — Cuelara",
  description: "Call Cuelara's Prompt Builder as an MCP tool (cuelara_build_prompt) from Claude Desktop, Claude Code, Cursor, or any MCP client.",
};

function content(base: string): string {
  return `**\`cuelara_build_prompt\`** turns a rough idea into a complete, ready-to-paste prompt for a specific target model — clear and lean, grounded only in what the idea actually says, with bracketed placeholders for anything genuinely missing.

## Set it up automatically

Paste this into the AI assistant you already have open — VS Code's Claude extension, Copilot Chat, Cursor, Claude Code, whatever it is — and it will ask you what it needs, then write the config file itself:

\`\`\`text
${mcpSetupPrompt(base)}
\`\`\`

## Fastest manual setup — Claude Code

\`\`\`bash
claude mcp add --transport http cuelara-token-optimizer ${base}/api/mcp
\`\`\`

That's the whole server, so \`cuelara_compress_prompt\` (Token Optimizer) and \`cuelara_optimize_prompt\` (Prompt Optimizer) come along too. For other clients — Claude Desktop, Cursor, Copilot, Gemini CLI, Antigravity — see the [client setup guides](/docs/mcp).

## How it gets triggered

You don't need to name the tool. Your assistant reads \`cuelara_build_prompt\`'s description against what you just asked and decides on its own whether to call it — so anything that reads as "turn this idea into a finished prompt for a specific model" tends to trigger it, for example:

- "Build me a prompt for Claude that does X."
- "Write a ready-to-paste ChatGPT prompt for this idea."
- "I need a prompt for Cursor that scopes this coding task properly."
- "Turn this idea into a prompt I can hand to Gemini."

If it doesn't fire on its own (some assistants are more conservative about picking tools, or confuse it with \`cuelara_optimize_prompt\`), just name it directly: "Use \`cuelara_build_prompt\` on this."

## Arguments

- \`idea\` (string, required) — the rough idea to turn into a prompt (max 4,000 characters).
- \`target\` (string, optional) — \`"Any AI model"\` (default), \`"ChatGPT"\`, \`"Claude"\`, \`"Gemini"\`, \`"Grok"\`, \`"DeepSeek"\`, \`"Cursor / Windsurf"\`, or \`"GitHub Copilot"\`.
- \`useCase\` (string, optional) — \`"General"\` (default), \`"Coding"\`, \`"Writing"\`, \`"Marketing"\`, \`"Business"\`, or \`"Research"\`.
- \`detail\` (string, optional) — \`"Concise"\`, \`"Balanced"\` (default), or \`"Detailed"\`.

## Call it directly

\`\`\`bash
curl -X POST ${base}/api/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "cuelara_build_prompt",
      "arguments": { "idea": "a chatbot that answers questions about our docs", "target": "Claude", "useCase": "Coding" }
    }
  }'
\`\`\`

Add \`-H "Authorization: Bearer YOUR_TOKEN_HERE"\` (a personal token from [/dashboard/mcp](/dashboard/mcp)) to authenticate as yourself instead of anonymously — your own plan's daily limit applies, and paid-plan output skips the "Built by Cuelara.com" attribution.

## Limits

Anonymous calls share the same free daily limit as the website's Prompt Builder, keyed by IP. Signed-in calls use your own account's plan limits instead.
`;
}

export default function Page() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-24 md:py-32">
      <Link href="/docs/mcp" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> MCP overview
      </Link>
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-2.5 text-orange-500 shrink-0">
          <WandSparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Prompt Builder</h1>
          <p className="text-sm text-muted-foreground">Build ready-to-paste prompts from any MCP client.</p>
        </div>
      </div>
      <div className={markdownProseClass}>
        <ReactMarkdown components={{ pre: CodeBlock }}>{content(siteUrl())}</ReactMarkdown>
      </div>
    </article>
  );
}
