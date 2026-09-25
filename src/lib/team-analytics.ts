import "server-only";
import { PLAN_TOOLS } from "@/lib/plan-tools";
import { getOwnPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { teamPoolKey } from "@/lib/rate-limit";
import { canManageMembers, getRole, seatUsage } from "@/lib/workspace";

const toolLabel = (id: string) => PLAN_TOOLS.find((t) => t.id === id)?.label ?? id;
const DAY_MS = 24 * 60 * 60 * 1000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export interface PoolRow {
  tool: string;
  label: string;
  used: number;
  limit: number;
}

/** Today's shared-pool usage for a team: one row per tool the manager's plan gives a pool for. */
export async function getPoolToday(workspaceId: string): Promise<PoolRow[]> {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { userId: true } });
  if (!ws) return [];
  const [plan, rows] = await Promise.all([
    getOwnPlan(ws.userId),
    prisma.toolUsageDaily.findMany({ where: { subjectKey: teamPoolKey(workspaceId), date: isoDay(new Date()) }, select: { tool: true, count: true } }),
  ]);
  const used = new Map(rows.map((r) => [r.tool, r.count]));
  return (plan?.limits ?? [])
    .filter((l) => l.teamDailyLimit != null && l.teamDailyLimit > 0)
    .map((l) => ({ tool: l.tool, label: toolLabel(l.tool), used: used.get(l.tool) ?? 0, limit: l.teamDailyLimit as number }));
}

export interface TeamAnalytics {
  days: number;
  totalRuns: number;
  activeMembers: number;
  memberCount: number;
  avgPerDay: number;
  seats: { used: number; pending: number; max: number };
  daily: { date: string; runs: number }[];
  byMember: { userId: string; name: string; email: string; role: string; runs: number; topTool: string | null; lastActive: string | null }[];
  byTool: { tool: string; label: string; runs: number }[];
  pool: PoolRow[];
}

/**
 * Usage of a team over the last `days` days, for its manager: counts only, never prompts or results. Built from the
 * per-day usage counters (which cover every run, unlike saved history, which is trimmed by plan) and only from the
 * day each member joined. Null unless the viewer is the owner or an admin.
 */
export async function getTeamAnalytics(viewerId: string, workspaceId: string, days: number): Promise<TeamAnalytics | null> {
  if (!canManageMembers(await getRole(viewerId, workspaceId))) return null;

  const start = new Date(Date.now() - (days - 1) * DAY_MS);
  const startDay = isoDay(start);
  const [members, seats, pool] = await Promise.all([
    prisma.workspaceMember.findMany({ where: { workspaceId }, select: { userId: true, role: true, createdAt: true, user: { select: { name: true, email: true } } } }),
    seatUsage(workspaceId),
    getPoolToday(workspaceId),
  ]);
  const byKey = new Map(members.map((m) => [`user:${m.userId}`, m]));

  const rows = await prisma.toolUsageDaily.findMany({
    where: { subjectKey: { in: Array.from(byKey.keys()) }, date: { gte: startDay } },
    select: { subjectKey: true, tool: true, date: true, count: true, updatedAt: true },
  });

  const dailyMap = new Map<string, number>();
  for (let i = 0; i < days; i++) dailyMap.set(isoDay(new Date(start.getTime() + i * DAY_MS)), 0);
  const toolMap = new Map<string, number>();
  const memberStats = new Map<string, { runs: number; tools: Map<string, number>; last: Date | null }>(members.map((m) => [m.userId, { runs: 0, tools: new Map(), last: null }]));

  for (const r of rows) {
    const member = byKey.get(r.subjectKey);
    if (!member || r.date < isoDay(member.createdAt)) continue; // nothing from before they joined
    dailyMap.set(r.date, (dailyMap.get(r.date) ?? 0) + r.count);
    toolMap.set(r.tool, (toolMap.get(r.tool) ?? 0) + r.count);
    const s = memberStats.get(member.userId)!;
    s.runs += r.count;
    s.tools.set(r.tool, (s.tools.get(r.tool) ?? 0) + r.count);
    if (!s.last || r.updatedAt > s.last) s.last = r.updatedAt;
  }

  const totalRuns = Array.from(dailyMap.values()).reduce((a, b) => a + b, 0);
  const byMember = members
    .map((m) => {
      const s = memberStats.get(m.userId)!;
      const top = Array.from(s.tools.entries()).sort((a, b) => b[1] - a[1])[0];
      return { userId: m.userId, name: m.user.name ?? "", email: m.user.email ?? "", role: m.role, runs: s.runs, topTool: top ? toolLabel(top[0]) : null, lastActive: s.last?.toISOString() ?? null };
    })
    .sort((a, b) => b.runs - a.runs);

  return {
    days,
    totalRuns,
    activeMembers: byMember.filter((m) => m.runs > 0).length,
    memberCount: members.length,
    avgPerDay: Math.round((totalRuns / days) * 10) / 10,
    seats,
    daily: Array.from(dailyMap.entries()).map(([date, runs]) => ({ date, runs })),
    byMember,
    byTool: Array.from(toolMap.entries()).map(([tool, runs]) => ({ tool, label: toolLabel(tool), runs })).sort((a, b) => b.runs - a.runs),
    pool,
  };
}
