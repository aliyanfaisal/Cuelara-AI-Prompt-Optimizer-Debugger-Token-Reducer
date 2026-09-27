/** A single copy-pasteable prompt that gets an AI coding assistant (VS Code w/ Claude, Cursor,
 * Copilot, Claude Desktop, Claude Code, Gemini CLI, Antigravity — whatever it's running in) to
 * gather what it needs and write the MCP config file itself, instead of the user hand-editing it. */
export function mcpSetupPrompt(base: string): string {
  return `Connect the Cuelara MCP server to whichever AI coding tool you're running in right now (VS Code with the Claude extension, VS Code with GitHub Copilot, Cursor, Claude Desktop, Claude Code CLI, Gemini CLI, or Antigravity). Do this:

0. First check: do you actually have file-editing or shell-command tools available in this session right now (i.e. are you running as an agent inside an editor/CLI with a real workspace, not a plain chat window with no file access)? If you don't, say so plainly, ask me which tool I want to connect, and just give me the exact config JSON or command to paste in myself — don't guess or pretend to write a file you can't reach.
1. If you do have those tools, detect which tool/editor you're running inside. If you can't tell, ask me.
2. Ask me: "Do you want to authenticate with a personal Cuelara access token (higher daily limit, no attribution line on paid plans), or connect anonymously?" If I say yes, ask me to paste the token — I'll generate one at ${base}/dashboard/mcp.
3. Based on the detected tool, create or update the correct MCP config with:
   - Server name: cuelara
   - Server URL: ${base}/api/mcp
   - If I gave you a token, add header "Authorization: Bearer <token>"

   Use the right format and location for the tool:
   - VS Code (Claude extension or Copilot Chat agent mode): create/update .vscode/mcp.json in the current workspace, under a "servers" key, with "type": "http" and "url".
   - Cursor: create/update .cursor/mcp.json under a "mcpServers" key, with "url" (and "headers" if I gave a token).
   - Claude Desktop: edit claude_desktop_config.json (ask me my OS if you need the exact path) using the mcp-remote bridge — "command": "npx", "args": ["-y", "mcp-remote", "${base}/api/mcp"] (append "--header", "Authorization: Bearer <token>" to args if I gave one).
   - Claude Code: don't write a file — instead run: claude mcp add --transport http cuelara ${base}/api/mcp (add --header "Authorization: Bearer <token>" if I gave one).
   - Gemini CLI: create/update ~/.gemini/settings.json under a "mcpServers" key, with "httpUrl" (and "headers" if I gave a token).
   - Antigravity: create/update its mcp_config.json under a "mcpServers" key, with "url" (and "headers" if I gave a token).
4. Show me the exact file content or command before writing or running it.
5. After it's in place, tell me how to verify the connection for that specific tool, and remind me that three tools become available: cuelara_compress_prompt (compress a verbose prompt), cuelara_optimize_prompt (turn a rough idea into a structured prompt), and cuelara_build_prompt (turn a rough idea into a ready-to-paste prompt for a specific target model).`;
}
