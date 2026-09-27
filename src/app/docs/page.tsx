import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import { Terminal } from "lucide-react";
import { siteUrl } from "@/lib/blog";
import { CodeBlock } from "@/components/markdown/CodeBlock";
import { markdownProseClass } from "@/components/markdown/prose";

export const metadata: Metadata = {
  title: "MCP Server — Cuelara",
  description: "Connect Cuelara's Token Optimizer to Claude Desktop, Claude Code, Cursor, or any MCP client, and compress prompts without opening the website.",
};

function content(base: string): string {
  return `Cuelara's Token Optimizer is available as a remote **MCP server** (Model Context Protocol), so any MCP-compatible AI client — Claude Desktop, Claude Code, Cursor, or your own agent — can call it directly as a tool, without opening the website.

The server is stateless: every request is self-contained, over plain JSON-RPC 2.0 at a single URL.

## Endpoint

\`\`\`
${base}/api/mcp
\`\`\`

## Connect from Claude Desktop or Claude Code

Claude Desktop and Claude Code connect to a remote MCP server through \`mcp-remote\`. Add this to your MCP config (\`claude_desktop_config.json\`, or via \`claude mcp add\` for Claude Code):

\`\`\`json
{
  "mcpServers": {
    "cuelara-token-optimizer": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${base}/api/mcp"]
    }
  }
}
\`\`\`

Restart the client, and \`cuelara_compress_prompt\` will show up as an available tool.

## Authenticating as yourself

Without a token, calls are anonymous — rate-limited by IP, same as a visitor to the website, and the compressed output gets a "Compressed by Cuelara.com" line appended.

Generate a personal token from [/dashboard/mcp](/dashboard/mcp) and pass it as a bearer token via \`mcp-remote\`'s \`--header\` flag:

\`\`\`json
{
  "mcpServers": {
    "cuelara-token-optimizer": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote", "${base}/api/mcp",
        "--header", "Authorization: Bearer YOUR_TOKEN_HERE"
      ]
    }
  }
}
\`\`\`

Signed-in calls use your own account's daily limit, and paid-plan output skips the attribution line. Free-plan accounts still get the attribution, same as anonymous calls.

## The tool

**\`cuelara_compress_prompt\`** — compresses a prompt while preserving every instruction and constraint, verified against a real tokenizer.

- \`text\` (string, required) — the prompt to compress.
- \`level\` (string, optional) — \`"Low (Safest)"\`, \`"Medium (Balanced)"\` (default), or \`"Aggressive (Max Savings)"\`.
- \`preserveFormatting\` (string, optional) — \`"Yes"\` (default) or \`"No"\`.

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
  return (
    <article className="container mx-auto max-w-3xl px-4 py-24 md:py-32">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary shrink-0">
          <Terminal className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">MCP Server</h1>
      </div>
      <div className={markdownProseClass}>
        <ReactMarkdown components={{ pre: CodeBlock }}>{content(siteUrl())}</ReactMarkdown>
      </div>
    </article>
  );
}
