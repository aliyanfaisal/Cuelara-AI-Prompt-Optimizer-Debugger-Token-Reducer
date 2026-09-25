import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanContext } from "@/lib/plans";

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface RequestSubject {
  subjectKey: string;
  isAuthenticated: boolean;
  /** The signed-in user's id, or null for an anonymous visitor. */
  userId: string | null;
  /** This user's per-tool plan overrides (tool id -> daily limit), or null if unauthenticated / no active plan. */
  planLimits: Record<string, number> | null;
  /**
   * When the user is on a team plan with shared daily pools: the team and each tool's shared limit. Every member's runs
   * count against this together (see resolvePlanLimit / consumeDailyLimit). Null for individuals and anonymous visitors.
   */
  teamPool: { workspaceId: string; limits: Record<string, number> } | null;
}

/**
 * Identifies who a request should be rate-limited as: a signed-in user's quota
 * follows their account ("user:<id>", stable across networks/devices), an
 * anonymous visitor's follows their IP ("ip:<hash>"). Also resolves the signed-in
 * user's active plan (if any) so its per-tool limit overrides can be applied.
 */
export async function getRequestSubject(req: Request): Promise<RequestSubject> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (userId) return subjectForUser(userId);

  const ip = getClientIp(req);
  return { subjectKey: `ip:${hashIp(ip)}`, isAuthenticated: false, userId: null, planLimits: null, teamPool: null };
}

/** The rate-limit subject for a signed-in user, including their effective plan's per-tool limits (see getEffectivePlan). */
export async function subjectForUser(userId: string): Promise<RequestSubject> {
  const { plan, team } = await getPlanContext(userId);
  const planLimits = plan && plan.limits.length > 0 ? Object.fromEntries(plan.limits.map((l) => [l.tool, l.dailyLimit])) : null;
  const poolEntries = plan ? plan.limits.filter((l) => l.teamDailyLimit != null && l.teamDailyLimit > 0).map((l) => [l.tool, l.teamDailyLimit as number] as const) : [];
  const teamPool = team && poolEntries.length > 0 ? { workspaceId: team.workspaceId, limits: Object.fromEntries(poolEntries) } : null;
  return { subjectKey: `user:${userId}`, isAuthenticated: true, userId, planLimits, teamPool };
}

/** Where a team's shared daily counter lives in ToolUsageDaily. */
export const teamPoolKey = (workspaceId: string) => `team:${workspaceId}`;

/**
 * A plan's per-tool override wins over the tool's normal authenticated/anonymous default when present. For a team
 * member the shared pool can lower it further: their limit today can't exceed what they've already used plus what the
 * whole team still has left. Expressing the pool as a smaller limit keeps every tool's "N left" counter and
 * "you've used your N" message correct without each tool knowing about pools.
 */
export async function resolvePlanLimit(subject: RequestSubject, tool: string, defaultLimit: number): Promise<number> {
  const own = subject.planLimits?.[tool] ?? defaultLimit;
  const poolLimit = subject.teamPool?.limits[tool];
  if (!subject.teamPool || !poolLimit) return own;

  const [memberUsed, poolUsed] = await Promise.all([getUsedToday(subject.subjectKey, tool), getUsedToday(teamPoolKey(subject.teamPool.workspaceId), tool)]);
  return Math.min(own, memberUsed + Math.max(0, poolLimit - poolUsed));
}

export async function getDailyLimit(settingKey: string, fallback: number): Promise<number> {
  const setting = await prisma.setting.findUnique({ where: { key: settingKey } });
  const parsed = setting?.value ? parseInt(setting.value, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function getUsedToday(subjectKey: string, tool: string): Promise<number> {
  const existing = await prisma.toolUsageDaily.findUnique({
    where: { subjectKey_tool_date: { subjectKey, tool, date: todayUtc() } },
  });
  return existing?.count ?? 0;
}

/** Read-only check — call before doing any paid work, to reject early. */
export async function hasReachedDailyLimit(subjectKey: string, tool: string, limit: number): Promise<boolean> {
  const used = await getUsedToday(subjectKey, tool);
  return used >= limit;
}

/** Call only once the costly work (the Gemini call) has actually happened. */
export async function consumeDailyLimit(subjectKey: string, tool: string): Promise<void> {
  const date = todayUtc();
  await prisma.toolUsageDaily.upsert({
    where: { subjectKey_tool_date: { subjectKey, tool, date } },
    create: { subjectKey, tool, date, count: 1 },
    update: { count: { increment: 1 } },
  });

  // A team member's run also counts against the team's shared pool for that tool.
  if (!subjectKey.startsWith("user:")) return;
  try {
    const { plan, team } = await getPlanContext(subjectKey.slice("user:".length));
    const poolLimit = plan?.limits.find((l) => l.tool === tool)?.teamDailyLimit;
    if (!team || !poolLimit) return;
    const key = teamPoolKey(team.workspaceId);
    await prisma.toolUsageDaily.upsert({
      where: { subjectKey_tool_date: { subjectKey: key, tool, date } },
      create: { subjectKey: key, tool, date, count: 1 },
      update: { count: { increment: 1 } },
    });
  } catch (error) {
    // The run already happened and the member's own counter is recorded; a pool-counter hiccup must not fail the request.
    console.error("Could not record team pool usage:", error);
  }
}
