"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { StatsRange } from "./constants";
import { assertAdmin } from "@/lib/admin-auth";

export interface TimeSeriesPoint {
  label: string;
  success: number;
  failure: number;
}

export interface ProviderStat {
  provider: string;
  total: number;
  success: number;
  failure: number;
}

export interface ModelStat {
  provider: string;
  model: string;
  total: number;
  success: number;
  failure: number;
}

export interface ToolStat {
  tool: string;
  total: number;
  success: number;
  failure: number;
}

export interface FailedCall {
  id: string;
  provider: string;
  model: string;
  tool: string;
  statusCode: number | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface ApiCallStats {
  range: StatsRange;
  /** Echoed back for "custom" so the dashboard can keep the date inputs filled in after a refresh. */
  from: string;
  to: string;
  totalCalls: number;
  successCount: number;
  failureCount: number;
  timeSeries: TimeSeriesPoint[];
  byProvider: ProviderStat[];
  byModel: ModelStat[];
  byTool: ToolStat[];
  recentFailures: FailedCall[];
}

const RANGE_CONFIG: Record<Exclude<StatsRange, "custom">, { spanMs: number; bucketMs: number; buckets: number }> = {
  day: { spanMs: 24 * 60 * 60 * 1000, bucketMs: 60 * 60 * 1000, buckets: 24 },
  week: { spanMs: 7 * 24 * 60 * 60 * 1000, bucketMs: 24 * 60 * 60 * 1000, buckets: 7 },
  month: { spanMs: 30 * 24 * 60 * 60 * 1000, bucketMs: 24 * 60 * 60 * 1000, buckets: 30 },
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_CUSTOM_BUCKETS = 60;

interface RangeWindow {
  from: Date;
  to: Date;
  bucketMs: number;
  buckets: number;
}

/** Custom ranges have no fixed span, so bucket size and count are derived from how wide the picked range is. */
function resolveWindow(range: StatsRange, customFrom?: string, customTo?: string): RangeWindow {
  const now = new Date();

  if (range !== "custom") {
    const config = RANGE_CONFIG[range];
    return { from: new Date(now.getTime() - config.spanMs), to: now, bucketMs: config.bucketMs, buckets: config.buckets };
  }

  const parsedFrom = customFrom ? new Date(customFrom) : null;
  const parsedTo = customTo ? new Date(customTo) : null;
  const to = parsedTo && !Number.isNaN(parsedTo.getTime()) ? parsedTo : now;
  const from =
    parsedFrom && !Number.isNaN(parsedFrom.getTime()) && parsedFrom.getTime() < to.getTime()
      ? parsedFrom
      : new Date(to.getTime() - RANGE_CONFIG.day.spanMs);

  const spanMs = Math.max(to.getTime() - from.getTime(), HOUR_MS);
  const bucketMs = spanMs <= 2 * DAY_MS ? HOUR_MS : DAY_MS;
  const buckets = Math.min(MAX_CUSTOM_BUCKETS, Math.max(1, Math.ceil(spanMs / bucketMs)));
  return { from, to, bucketMs, buckets };
}

function formatBucketLabel(bucketMs: number, date: Date): string {
  if (bucketMs < DAY_MS) {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: true }).format(date);
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

const FAILURE_LIST_LIMIT = 50;

export async function getApiCallStats(range: StatsRange, customFrom?: string, customTo?: string): Promise<ApiCallStats> {
  await assertAdmin();
  const { from: cutoff, to: until, bucketMs, buckets: bucketCount } = resolveWindow(range, customFrom, customTo);

  const [rows, recentFailureRows] = await Promise.all([
    prisma.apiCallLog.findMany({
      where: { ownKey: false, createdAt: { gte: cutoff, lte: until } },
      select: { provider: true, model: true, tool: true, success: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.apiCallLog.findMany({
      where: { ownKey: false, success: false, createdAt: { gte: cutoff, lte: until } },
      orderBy: { createdAt: "desc" },
      take: FAILURE_LIST_LIMIT,
    }),
  ]);

  // Pre-seed every bucket (including empty ones) so the chart shows real gaps, not a skipped axis.
  const buckets: TimeSeriesPoint[] = Array.from({ length: bucketCount }, (_, i) => ({
    label: formatBucketLabel(bucketMs, new Date(cutoff.getTime() + i * bucketMs)),
    success: 0,
    failure: 0,
  }));

  const providerMap = new Map<string, ProviderStat>();
  const modelMap = new Map<string, ModelStat>();
  const toolMap = new Map<string, ToolStat>();
  let successCount = 0;
  let failureCount = 0;

  for (const row of rows) {
    if (row.success) successCount++;
    else failureCount++;

    const bucketIndex = Math.min(bucketCount - 1, Math.max(0, Math.floor((row.createdAt.getTime() - cutoff.getTime()) / bucketMs)));
    if (row.success) buckets[bucketIndex].success++;
    else buckets[bucketIndex].failure++;

    const provider = providerMap.get(row.provider) ?? { provider: row.provider, total: 0, success: 0, failure: 0 };
    provider.total++;
    if (row.success) provider.success++;
    else provider.failure++;
    providerMap.set(row.provider, provider);

    const modelKey = `${row.provider}::${row.model}`;
    const model = modelMap.get(modelKey) ?? { provider: row.provider, model: row.model, total: 0, success: 0, failure: 0 };
    model.total++;
    if (row.success) model.success++;
    else model.failure++;
    modelMap.set(modelKey, model);

    const tool = toolMap.get(row.tool) ?? { tool: row.tool, total: 0, success: 0, failure: 0 };
    tool.total++;
    if (row.success) tool.success++;
    else tool.failure++;
    toolMap.set(row.tool, tool);
  }

  return {
    range,
    from: cutoff.toISOString(),
    to: until.toISOString(),
    totalCalls: rows.length,
    successCount,
    failureCount,
    timeSeries: buckets,
    byProvider: Array.from(providerMap.values()).sort((a, b) => b.total - a.total),
    byModel: Array.from(modelMap.values()).sort((a, b) => b.total - a.total),
    byTool: Array.from(toolMap.values()).sort((a, b) => b.total - a.total),
    recentFailures: recentFailureRows.map((row) => ({
      id: row.id,
      provider: row.provider,
      model: row.model,
      tool: row.tool,
      statusCode: row.statusCode,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

/** Wipes every logged provider call — the dashboard starts counting from zero again. */
export async function resetApiCallStats(): Promise<{ success: true; deleted: number } | { error: string }> {
  await assertAdmin();
  try {
    const { count } = await prisma.apiCallLog.deleteMany({});
    revalidatePath("/admin/analytics");
    return { success: true, deleted: count };
  } catch {
    return { error: "Failed to reset analytics." };
  }
}
