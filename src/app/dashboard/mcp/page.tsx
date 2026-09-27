import Link from "next/link";
import { getSessionUser } from "@/lib/session-user";
import { listPersonalAccessTokens } from "@/lib/personal-access-tokens";
import { McpTokensManager } from "./McpTokensManager";

export const metadata = { title: "MCP Tokens" };

export default async function McpTokensPage() {
  const user = (await getSessionUser())!;
  const tokens = await listPersonalAccessTokens(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">MCP Tokens</h2>
        <p className="text-sm text-muted-foreground">
          Authenticate Claude Desktop, Claude Code, Cursor, or any MCP client as yourself, so tool calls use your own plan&rsquo;s limits.{" "}
          <Link href="/docs/mcp" className="font-semibold text-primary hover:underline">
            See connection instructions
          </Link>
          .
        </p>
      </div>
      <McpTokensManager initial={tokens} />
    </div>
  );
}
