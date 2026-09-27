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

## Fastest setup — Claude Code

\`\`\`bash
claude mcp add --transport http cuelara-token-optimizer ${base}/api/mcp
\`\`\`

That's the whole server, so \`cuelara_compress_prompt\` (Token Optimizer) comes along too. For other clients — Claude Desktop, Cursor, Copilot, Gemini CLI, Antigravity — see the [client setup guides](/docs/mcp), which show the exact config for each one. This manual setup is the reliable path — prefer it.

## How it gets triggered

You don't need to name the tool. Your assistant reads \`cuelara_optimize_prompt\`'s description against what you just asked and decides on its own whether to call it — so anything that reads as "turn this rough idea into a real, structured prompt" tends to trigger it, for example:

- "Turn this into a proper prompt I can paste into ChatGPT: build me a login page."
- "Write me a detailed prompt for a research assistant that summarizes papers."
- "Structure this rough idea into a full prompt with constraints and an output format."
- "Help me write a better prompt for this coding task."

If it doesn't fire on its own (some assistants are more conservative about picking tools), just name it directly: "Use \`cuelara_optimize_prompt\` on this."

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
