import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectivePlan } from "@/lib/plans";

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
  return { subjectKey: `ip:${hashIp(ip)}`, isAuthenticated: false, userId: null, planLimits: null };
}

/** The rate-limit subject for a signed-in user, including their effective plan's per-tool limits (see getEffectivePlan). */
export async function subjectForUser(userId: string): Promise<RequestSubject> {
  const plan = await getEffectivePlan(userId);
  const planLimits = plan && plan.limits.length > 0 ? Object.fromEntries(plan.limits.map((l) => [l.tool, l.dailyLimit])) : null;
  return { subjectKey: `user:${userId}`, isAuthenticated: true, userId, planLimits };
}

/** A plan's per-tool override wins over the tool's normal authenticated/anonymous default when present. */
export function resolvePlanLimit(subject: RequestSubject, tool: string, defaultLimit: number): number {
  return subject.planLimits?.[tool] ?? defaultLimit;
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
}
