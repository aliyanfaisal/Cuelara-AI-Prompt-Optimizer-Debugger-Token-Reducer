import { prisma } from "@/lib/prisma";
import { HISTORY_TOOLS, historyToolLabel } from "@/lib/history";
import { getSubjectDailyUsage } from "@/lib/dashboard-usage";
import { getEffectivePlan } from "@/lib/plans";
import { subjectForUser } from "@/lib/rate-limit";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DashboardStats {
  planName: string | null;
  totalRuns: number;
  runsToday: number;
  runsThisWeek: number;
  /** Last 7 days, oldest first, in UTC (the same day boundary the daily limits use). */
  activity: { date: string; label: string; count: number }[];
  perTool: { id: string; label: string; count: number }[];
  usage: { id: string; label: string; used: number; limit: number }[];
  recent: { id: string; tool: string; toolLabel: string; title: string; updatedAt: Date }[];
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const since = new Date(Date.now() - 6 * DAY_MS);
  since.setUTCHours(0, 0, 0, 0);

  const [plan, totalRuns, weekRuns, byTool, recent, subject] = await Promise.all([
    getEffectivePlan(userId),
    prisma.toolRun.count({ where: { userId } }),
    prisma.toolRun.findMany({ where: { userId, createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.toolRun.groupBy({ by: ["tool"], where: { userId }, _count: { _all: true } }),
    prisma.toolRun.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, tool: true, title: true, updatedAt: true } }),
    subjectForUser(userId),
  ]);

  const counts = new Map<string, number>();
  for (const r of weekRuns) counts.set(isoDay(r.createdAt), (counts.get(isoDay(r.createdAt)) ?? 0) + 1);
  const activity = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(since.getTime() + i * DAY_MS);
    return { date: isoDay(d), label: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }), count: counts.get(isoDay(d)) ?? 0 };
  });

  const usage = await getSubjectDailyUsage(subject);
  const perToolCounts = new Map(byTool.map((t) => [t.tool, t._count._all]));

  return {
    planName: plan?.name ?? null,
    totalRuns,
    runsToday: usage.reduce((sum, u) => sum + u.used, 0),
    runsThisWeek: weekRuns.length,
    activity,
    perTool: HISTORY_TOOLS.map((t) => ({ id: t.id, label: t.label, count: perToolCounts.get(t.id) ?? 0 }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count),
    usage,
    recent: recent.map((r) => ({ ...r, toolLabel: historyToolLabel(r.tool) })),
  };
}
