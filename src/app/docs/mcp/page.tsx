import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, ArrowRight, Terminal, MessageSquare, MousePointer2, Code2, Bot, Sparkles, Rocket, type LucideIcon } from "lucide-react";
import { siteUrl } from "@/lib/blog";
import { CodeBlock } from "@/components/markdown/CodeBlock";
import { markdownProseClass } from "@/components/markdown/prose";
import { MCP_CLIENTS, type McpClientDoc } from "@/lib/docs/mcp-clients";

export const metadata: Metadata = {
  title: "MCP Server — Cuelara",
  description: "Connect Cuelara's Token Optimizer to Claude Desktop, Claude Code, Cursor, or any MCP client, and compress prompts without opening the website.",
};

const ICONS: Record<McpClientDoc["icon"], LucideIcon> = {
  terminal: Terminal,
  "message-square": MessageSquare,
  "mouse-pointer": MousePointer2,
  code: Code2,
  github: Bot,
  sparkles: Sparkles,
  rocket: Rocket,
};

function content(base: string): string {
  return `Cuelara's Token Optimizer is available as a remote **MCP server** (Model Context Protocol), so any MCP-compatible AI client — Claude Desktop, Claude Code, Cursor, Copilot, Gemini CLI, and more — can call it directly as a tool, without opening the website.

The server is stateless: every request is self-contained, over plain JSON-RPC 2.0 at a single URL.

## Endpoint

\`\`\`
${base}/api/mcp
\`\`\`

Pick your client below for exact setup steps, or use the reference below to call it directly.

## The tool

**\`cuelara_compress_prompt\`** — compresses a prompt while preserving every instruction and constraint, verified against a real tokenizer.

- \`text\` (string, required) — the prompt to compress.
- \`level\` (string, optional) — \`"Low (Safest)"\`, \`"Medium (Balanced)"\` (default), or \`"Aggressive (Max Savings)"\`.
- \`preserveFormatting\` (string, optional) — \`"Yes"\` (default) or \`"No"\`.

## Authenticating as yourself

Without a token, calls are anonymous — rate-limited by IP, same as a visitor to the website, and the compressed output gets a "Compressed by Cuelara.com" line appended.

Generate a personal token from [/dashboard/mcp](/dashboard/mcp) and pass it as a bearer token — each client page below shows exactly where it goes. Signed-in calls use your own account's daily limit, and paid-plan output skips the attribution line. Free-plan accounts still get the attribution, same as anonymous calls.

## Call it directly

No SDK needed — it's plain JSON-RPC 2.0 over HTTP. For example, to list the available tools:

\`\`\`bash
curl -X POST ${base}/api/mcp \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
\`\`\`

And to compress a prompt:

\`\`\`bash
curl -X POST ${base}/api/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "cuelara_compress_prompt",
      "arguments": { "text": "Could you please help me write a Python script that..." }
    }
  }'
\`\`\`

Add \`-H "Authorization: Bearer YOUR_TOKEN_HERE"\` to authenticate as yourself instead of anonymously.

## Limits

Anonymous calls share the same free daily limit as the website's Token Optimizer, keyed by IP. Signed-in calls (via a personal token from [/dashboard/mcp](/dashboard/mcp)) use your own account's plan limits instead.

More tools and a full REST API for the rest of Cuelara's tools are on the way.
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
          <Terminal className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">MCP Server</h1>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MCP_CLIENTS.map((client) => {
          const Icon = ICONS[client.icon];
          return (
            <Link
              key={client.slug}
              href={`/docs/mcp/${client.slug}`}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div className="rounded-lg border border-border bg-muted/40 p-2 text-muted-foreground shrink-0 group-hover:text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">{client.name}</div>
                <div className="truncate text-xs text-muted-foreground">{client.tagline}</div>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          );
        })}
      </div>

      <div className={markdownProseClass}>
        <ReactMarkdown components={{ pre: CodeBlock }}>{content(base)}</ReactMarkdown>
      </div>
    </article>
  );
}
