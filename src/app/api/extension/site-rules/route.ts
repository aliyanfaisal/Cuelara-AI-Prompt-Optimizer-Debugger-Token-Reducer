import { NextResponse } from "next/server";
import { resolveCaller } from "@/lib/api-caller";
import { normalizeDomain } from "@/lib/extension/domain";
import { listSiteRules, mergeSiteRules, removeSiteRule, setSiteRule } from "@/lib/extension/site-rules";
import { reportError } from "@/lib/error-report";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

/** Site rules belong to an account, so these need a connected extension (an anonymous caller has no rules to sync). */
async function connectedUserId(req: Request): Promise<string | NextResponse> {
  const caller = await resolveCaller(req);
  if ("error" in caller) return NextResponse.json({ error: caller.error, code: "INVALID_TOKEN" }, { status: 401, headers: NO_STORE });
  if (!caller.subject.userId) return NextResponse.json({ error: "Connect your Cuelara account to sync site rules.", code: "NOT_CONNECTED" }, { status: 401, headers: NO_STORE });
  return caller.subject.userId;
}

async function handle(req: Request, run: (userId: string) => Promise<Response>): Promise<Response> {
  const userId = await connectedUserId(req);
  if (userId instanceof NextResponse) return userId;
  try {
    return await run(userId);
  } catch (error) {
    console.error("Extension site rules error:", error);
    void reportError(error, { source: "api", route: "/api/extension/site-rules" });
    return NextResponse.json({ error: "Could not update your site rules." }, { status: 500 });
  }
}

export function GET(req: Request) {
  return handle(req, async (userId) => NextResponse.json({ rules: await listSiteRules(userId) }, { headers: NO_STORE }));
}

/** Sets one rule: { domain, mode: "block" | "allow" }. A rule on a domain covers its subdomains. */
export function PUT(req: Request) {
  return handle(req, async (userId) => {
    const body = await req.json().catch(() => null);
    const domain = typeof body?.domain === "string" ? normalizeDomain(body.domain) : null;
    if (!domain) return NextResponse.json({ error: "That isn't a valid website address." }, { status: 400 });
    if (body.mode !== "block" && body.mode !== "allow") return NextResponse.json({ error: "mode must be \"block\" or \"allow\"." }, { status: 400 });
    await setSiteRule(userId, domain, body.mode);
    return NextResponse.json({ rules: await listSiteRules(userId) }, { headers: NO_STORE });
  });
}

/** Removes one rule: ?domain=example.com */
export function DELETE(req: Request) {
  return handle(req, async (userId) => {
    const domain = normalizeDomain(new URL(req.url).searchParams.get("domain") ?? "");
    if (!domain) return NextResponse.json({ error: "That isn't a valid website address." }, { status: 400 });
    await removeSiteRule(userId, domain);
    return NextResponse.json({ rules: await listSiteRules(userId) }, { headers: NO_STORE });
  });
}

/** Merges rules the browser collected before it was connected: { rules: [{ domain, mode }] }. Existing account rules win. */
export function POST(req: Request) {
  return handle(req, async (userId) => {
    const body = await req.json().catch(() => null);
    if (!Array.isArray(body?.rules)) return NextResponse.json({ error: "rules must be an array." }, { status: 400 });
    const rules = body.rules.filter((r: unknown): r is { domain: unknown; mode: unknown } => typeof r === "object" && r !== null);
    return NextResponse.json({ rules: await mergeSiteRules(userId, rules) }, { headers: NO_STORE });
  });
}
