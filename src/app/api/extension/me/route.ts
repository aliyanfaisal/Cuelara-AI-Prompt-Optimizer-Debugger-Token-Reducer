import { NextResponse } from "next/server";
import { resolveCaller } from "@/lib/api-caller";
import { getSubjectDailyUsage } from "@/lib/dashboard-usage";
import { getPlanContext } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { listSiteRules } from "@/lib/extension/site-rules";
import { reportError } from "@/lib/error-report";

export const runtime = "nodejs";

/** Oldest extension build the API still supports; older ones are asked to update. Bump when a change breaks them. */
const MIN_EXTENSION_VERSION = "1.0.0";

/**
 * What the extension's popup shows: who is connected (nobody is fine — anonymous callers get the free limits), today's
 * usage per tool, and the synced site rules. The bearer token is optional, same as the public REST API.
 */
export async function GET(req: Request) {
  try {
    const caller = await resolveCaller(req);
    if ("error" in caller) return NextResponse.json({ error: caller.error, code: "INVALID_TOKEN" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const { subject } = caller;

    const [usage, user, planContext, rules] = await Promise.all([
      getSubjectDailyUsage(subject),
      subject.userId ? prisma.user.findUnique({ where: { id: subject.userId }, select: { name: true, email: true } }) : null,
      subject.userId ? getPlanContext(subject.userId) : null,
      subject.userId ? listSiteRules(subject.userId) : [],
    ]);

    return NextResponse.json(
      {
        authenticated: subject.isAuthenticated,
        user: user ? { name: user.name, email: user.email } : null,
        plan: planContext?.plan ? { name: planContext.plan.name, isFree: planContext.plan.priceMonthlyCents === 0 } : null,
        usage,
        rules,
        minVersion: MIN_EXTENSION_VERSION,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Extension me error:", error);
    void reportError(error, { source: "api", route: "/api/extension/me" });
    return NextResponse.json({ error: "Could not load your account." }, { status: 500 });
  }
}
