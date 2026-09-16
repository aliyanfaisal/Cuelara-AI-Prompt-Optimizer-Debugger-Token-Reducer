"use server";

import { prisma } from "@/lib/prisma";
import type { StatsRange } from "./constants";

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
  totalCalls: number;
  successCount: number;
  failureCount: number;
  timeSeries: TimeSeriesPoint[];
  byProvider: ProviderStat[];
  byModel: ModelStat[];
  byTool: ToolStat[];
  recentFailures: FailedCall[];
}

const RANGE_CONFIG: Record<StatsRange, { spanMs: number; bucketMs: number; buckets: number }> = {
  day: { spanMs: 24 * 60 * 60 * 1000, bucketMs: 60 * 60 * 1000, buckets: 24 },
  week: { spanMs: 7 * 24 * 60 * 60 * 1000, bucketMs: 24 * 60 * 60 * 1000, buckets: 7 },
  month: { spanMs: 30 * 24 * 60 * 60 * 1000, bucketMs: 24 * 60 * 60 * 1000, buckets: 30 },
};

function formatBucketLabel(range: StatsRange, date: Date): string {
  if (range === "day") {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: true }).format(date);
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

const FAILURE_LIST_LIMIT = 50;

export async function getApiCallStats(range: StatsRange): Promise<ApiCallStats> {
  const config = RANGE_CONFIG[range];
  const now = Date.now();
  const cutoff = new Date(now - config.spanMs);

  const [rows, recentFailureRows] = await Promise.all([
    prisma.apiCallLog.findMany({
      where: { createdAt: { gte: cutoff } },
      select: { provider: true, model: true, tool: true, success: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.apiCallLog.findMany({
      where: { success: false, createdAt: { gte: cutoff } },
      orderBy: { createdAt: "desc" },
      take: FAILURE_LIST_LIMIT,
    }),
  ]);

  // Pre-seed every bucket (including empty ones) so the chart shows real gaps, not a skipped axis.
  const buckets: TimeSeriesPoint[] = Array.from({ length: config.buckets }, (_, i) => ({
    label: formatBucketLabel(range, new Date(cutoff.getTime() + i * config.bucketMs)),
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

    const bucketIndex = Math.min(
      config.buckets - 1,
      Math.max(0, Math.floor((row.createdAt.getTime() - cutoff.getTime()) / config.bucketMs))
    );
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
