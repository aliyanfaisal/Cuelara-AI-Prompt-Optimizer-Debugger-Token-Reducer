export interface McpClientDoc {
  slug: string;
  name: string;
  tagline: string;
  icon: "terminal" | "message-square" | "mouse-pointer" | "code" | "github" | "sparkles" | "rocket";
  content: (base: string) => string;
}

const REMOTE_CONFIG = (base: string, name: string, withAuth: boolean) => `{
  "mcpServers": {
    "cuelara-token-optimizer": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote", "${base}/api/mcp"${
          withAuth
            ? `,\n        "--header", "Authorization: Bearer YOUR_TOKEN_HERE"`
            : ""
        }
      ]
    }
  }
}`;

export const MCP_CLIENTS: McpClientDoc[] = [
  {
    slug: "claude-code",
    name: "Claude Code",
    tagline: "Add Cuelara as a remote MCP server straight from the CLI.",
    icon: "terminal",
    content: (base) => `Claude Code can talk to remote MCP servers natively over HTTP — no bridge needed.

## Add the server

\`\`\`bash
claude mcp add --transport http cuelara-token-optimizer ${base}/api/mcp
\`\`\`

This adds it to the current project. Use \`--scope user\` instead to make it available in every project:

\`\`\`bash
claude mcp add --transport http cuelara-token-optimizer ${base}/api/mcp --scope user
\`\`\`

## Authenticate as yourself (optional)

Without a token, calls are anonymous. Generate a personal token from [/dashboard/mcp](/dashboard/mcp) and pass it as a header:

\`\`\`bash
claude mcp add --transport http cuelara-token-optimizer ${base}/api/mcp --header "Authorization: Bearer YOUR_TOKEN_HERE"
\`\`\`

## Verify

Run \`/mcp\` inside Claude Code to confirm it connected, then just ask it to compress or restructure a prompt — Claude will call \`cuelara_compress_prompt\` or \`cuelara_optimize_prompt\` on its own when it decides the task calls for it.`,
  },
  {
    slug: "claude-desktop",
    name: "Claude Desktop",
    tagline: "Connect via mcp-remote in your Claude Desktop config.",
    icon: "message-square",
    content: (base) => `Claude Desktop only speaks to local (stdio) MCP servers, so it connects to Cuelara through \`mcp-remote\`, a small bridge that proxies stdio to our remote HTTP endpoint.

## Config

Open Settings → Developer → Edit Config (or edit \`claude_desktop_config.json\` directly) and add:

\`\`\`json
${REMOTE_CONFIG(base, "cuelara-token-optimizer", false)}
\`\`\`

Restart Claude Desktop. \`cuelara_compress_prompt\` and \`cuelara_optimize_prompt\` will show up under the hammer icon as available tools.

## Authenticate as yourself (optional)

Generate a personal token from [/dashboard/mcp](/dashboard/mcp), then add it as a header:

\`\`\`json
${REMOTE_CONFIG(base, "cuelara-token-optimizer", true)}
\`\`\`

Signed-in calls use your own plan's daily limit, and paid-plan output skips the "Compressed by Cuelara.com" line.`,
  },
  {
    slug: "cursor",
    name: "Cursor",
    tagline: "Add Cuelara under Cursor Settings → MCP.",
    icon: "mouse-pointer",
    content: (base) => `Cursor supports remote HTTP MCP servers natively.

## Config

Open Cursor Settings → MCP → Add new MCP server, or edit \`.cursor/mcp.json\` in your project (or \`~/.cursor/mcp.json\` globally):

\`\`\`json
{
  "mcpServers": {
    "cuelara-token-optimizer": {
      "url": "${base}/api/mcp"
    }
  }
}
\`\`\`

## Authenticate as yourself (optional)

Generate a personal token from [/dashboard/mcp](/dashboard/mcp) and add it as a header:

\`\`\`json
{
  "mcpServers": {
    "cuelara-token-optimizer": {
      "url": "${base}/api/mcp",
      "headers": { "Authorization": "Bearer YOUR_TOKEN_HERE" }
    }
  }
}
\`\`\`

Reopen the MCP settings panel — Cuelara should show a green "connected" dot, and Cursor's agent can now call \`cuelara_compress_prompt\` or \`cuelara_optimize_prompt\` when it's useful.`,
  },
  {
    slug: "vscode-claude",
    name: "VS Code (Claude extension)",
    tagline: "Connect Cuelara to the Claude extension for VS Code.",
    icon: "code",
    content: (base) => `VS Code's built-in MCP support works the same way for the Claude extension as it does for Copilot Chat's agent mode.

## Config

Create \`.vscode/mcp.json\` in your workspace (VS Code will prompt you to trust it):

\`\`\`json
{
  "servers": {
    "cuelara-token-optimizer": {
      "type": "http",
      "url": "${base}/api/mcp"
    }
  }
}
\`\`\`

## Authenticate as yourself (optional)

Generate a personal token from [/dashboard/mcp](/dashboard/mcp):

\`\`\`json
{
  "servers": {
    "cuelara-token-optimizer": {
      "type": "http",
      "url": "${base}/api/mcp",
      "headers": { "Authorization": "Bearer YOUR_TOKEN_HERE" }
    }
  }
}
\`\`\`

Open the Command Palette → "MCP: List Servers" to confirm it started, then ask Claude in the sidebar to compress or restructure a prompt.`,
  },
  {
    slug: "copilot",
    name: "GitHub Copilot",
    tagline: "Connect Cuelara to Copilot Chat's agent mode in VS Code.",
    icon: "github",
    content: (base) => `GitHub Copilot Chat uses VS Code's built-in MCP client, available in agent mode.

## Config

Create \`.vscode/mcp.json\` in your workspace:

\`\`\`json
{
  "servers": {
    "cuelara-token-optimizer": {
      "type": "http",
      "url": "${base}/api/mcp"
    }
  }
}
\`\`\`

## Authenticate as yourself (optional)

Generate a personal token from [/dashboard/mcp](/dashboard/mcp):

\`\`\`json
{
  "servers": {
    "cuelara-token-optimizer": {
      "type": "http",
      "url": "${base}/api/mcp",
      "headers": { "Authorization": "Bearer YOUR_TOKEN_HERE" }
    }
  }
}
\`\`\`

Switch Copilot Chat to **Agent** mode, click the tools icon to confirm \`cuelara_compress_prompt\` and \`cuelara_optimize_prompt\` are listed, then ask it to compress or restructure a prompt.`,
  },
  {
    slug: "gemini",
    name: "Gemini CLI",
    tagline: "Add Cuelara to Gemini CLI's settings.json.",
    icon: "sparkles",
    content: (base) => `Gemini CLI supports remote MCP servers over HTTP via its settings file.

## Config

Edit \`~/.gemini/settings.json\` (or \`.gemini/settings.json\` in your project):

\`\`\`json
{
  "mcpServers": {
    "cuelara-token-optimizer": {
      "httpUrl": "${base}/api/mcp"
    }
  }
}
\`\`\`

## Authenticate as yourself (optional)

Generate a personal token from [/dashboard/mcp](/dashboard/mcp):

\`\`\`json
{
  "mcpServers": {
    "cuelara-token-optimizer": {
      "httpUrl": "${base}/api/mcp",
      "headers": { "Authorization": "Bearer YOUR_TOKEN_HERE" }
    }
  }
}
\`\`\`

Run \`/mcp\` inside a Gemini CLI session to confirm it connected.`,
  },
  {
    slug: "antigravity",
    name: "Antigravity",
    tagline: "Connect Cuelara to Google's Antigravity IDE.",
    icon: "rocket",
    content: (base) => `Antigravity's agent manager supports remote MCP servers, configured the same way as other VS Code-family editors.

## Config

Open the MCP panel from the agent manager (or edit \`mcp_config.json\` in your Antigravity settings) and add:

\`\`\`json
{
  "mcpServers": {
    "cuelara-token-optimizer": {
      "url": "${base}/api/mcp"
    }
  }
}
\`\`\`

## Authenticate as yourself (optional)

Generate a personal token from [/dashboard/mcp](/dashboard/mcp):

\`\`\`json
{
  "mcpServers": {
    "cuelara-token-optimizer": {
      "url": "${base}/api/mcp",
      "headers": { "Authorization": "Bearer YOUR_TOKEN_HERE" }
    }
  }
}
\`\`\`

If your Antigravity version doesn't yet support a remote \`url\` field, fall back to the \`mcp-remote\` bridge shown on the [Claude Desktop](/docs/mcp/claude-desktop) page — it works with any client that only supports local stdio servers.`,
  },
];

export function getMcpClient(slug: string): McpClientDoc | undefined {
  return MCP_CLIENTS.find((c) => c.slug === slug);
}
