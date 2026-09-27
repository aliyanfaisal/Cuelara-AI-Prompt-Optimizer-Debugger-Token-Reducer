import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Zap } from "lucide-react";
import { siteUrl } from "@/lib/blog";
import { CodeBlock } from "@/components/markdown/CodeBlock";
import { markdownProseClass } from "@/components/markdown/prose";
import { mcpSetupPrompt } from "@/lib/docs/mcp-setup-prompt";

export const metadata: Metadata = {
  title: "Token Optimizer MCP Tool — Cuelara",
  description: "Call Cuelara's Token Optimizer as an MCP tool (cuelara_compress_prompt) from Claude Desktop, Claude Code, Cursor, or any MCP client.",
};

function content(base: string): string {
  return `**\`cuelara_compress_prompt\`** compresses a prompt to use fewer tokens while preserving every instruction and constraint, verified against a real tokenizer — not an estimate.

## Fastest setup — Claude Code

\`\`\`bash
claude mcp add --transport http cuelara-token-optimizer ${base}/api/mcp
\`\`\`

That's the whole server, so \`cuelara_optimize_prompt\` (Prompt Optimizer) comes along too. For other clients — Claude Desktop, Cursor, Copilot, Gemini CLI, Antigravity — see the [client setup guides](/docs/mcp), which show the exact config for each one. This manual setup is the reliable path — prefer it.

## How it gets triggered

You don't need to name the tool. Your assistant reads \`cuelara_compress_prompt\`'s description against what you just asked and decides on its own whether to call it — so anything that reads as "make this prompt shorter/cheaper without losing meaning" tends to trigger it, for example:

- "Compress this prompt so it uses fewer tokens."
- "This system prompt is too long — trim it down but keep every instruction."
- "Make this more token-efficient before I put it in production."
- "Shorten this without losing any of the constraints."

If it doesn't fire on its own (some assistants are more conservative about picking tools), just name it directly: "Use \`cuelara_compress_prompt\` on this."

## Arguments

- \`text\` (string, required) — the prompt to compress.
- \`level\` (string, optional) — \`"Low (Safest)"\`, \`"Medium (Balanced)"\` (default), or \`"Aggressive (Max Savings)"\`.
- \`preserveFormatting\` (string, optional) — \`"Yes"\` (default) or \`"No"\`.

## Call it directly

\`\`\`bash
curl -X POST ${base}/api/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "cuelara_compress_prompt",
      "arguments": { "text": "Could you please help me write a Python script that...", "level": "Aggressive (Max Savings)" }
    }
  }'
\`\`\`

Add \`-H "Authorization: Bearer YOUR_TOKEN_HERE"\` (a personal token from [/dashboard/mcp](/dashboard/mcp)) to authenticate as yourself instead of anonymously — your own plan's daily limit applies, and paid-plan output skips the "Compressed by Cuelara.com" attribution.

## Limits

Anonymous calls share the same free daily limit as the website's Token Optimizer, keyed by IP. Signed-in calls use your own account's plan limits instead.

## Or set it up automatically

This only works if you paste it into an AI assistant running **inside an editor or CLI with real file/shell tools and a workspace** — Claude Code, Cursor, VS Code's Claude extension or Copilot Chat agent mode, Gemini CLI. It will not work in a plain chat window (claude.ai, the Claude desktop chat app) — those have no file access, so it can't write anything for you. If you're not sure which one you're in, use the manual steps above instead.

\`\`\`text
${mcpSetupPrompt(base)}
\`\`\`
`;
}

export default function Page() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-24 md:py-32">
      <Link href="/docs/mcp" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> MCP overview
      </Link>
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-amber-500 shrink-0">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Token Optimizer</h1>
          <p className="text-sm text-muted-foreground">Compress prompts from any MCP client.</p>
        </div>
      </div>
      <div className={markdownProseClass}>
        <ReactMarkdown components={{ pre: CodeBlock }}>{content(siteUrl())}</ReactMarkdown>
      </div>
    </article>
  );
}
