import { getRequestSubject, subjectForUser, type RequestSubject } from "@/lib/rate-limit";
import { resolveUserIdFromToken } from "@/lib/personal-access-tokens";
import { getPlanContext } from "@/lib/plans";

export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

/** Resolves the caller behind a request: a Cuelara personal access token (see /dashboard/mcp)
 * identifies a specific user, so their own plan's limits apply instead of the anonymous IP-based
 * default — and paid users skip the "by Cuelara.com" attribution appended to free/anonymous output.
 * Shared by the MCP server (src/app/api/mcp/route.ts) and the REST API (src/app/api/v1/*). */
export async function resolveCaller(req: Request): Promise<{ subject: RequestSubject; isFreeCaller: boolean } | { error: string }> {
  const token = bearerToken(req);
  if (!token) {
    return { subject: await getRequestSubject(req), isFreeCaller: true };
  }
  const userId = await resolveUserIdFromToken(token);
  if (!userId) {
    return { error: "That Cuelara API token is invalid or has been revoked. Generate a new one at cuelara.com/dashboard/mcp." };
  }
  const subject = await subjectForUser(userId);
  const { plan } = await getPlanContext(userId);
  return { subject, isFreeCaller: !plan || plan.priceMonthlyCents === 0 };
}
