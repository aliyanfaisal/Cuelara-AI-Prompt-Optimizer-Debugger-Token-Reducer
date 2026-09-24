export const STATS_RANGES = ["day", "week", "month", "custom"] as const;
export type StatsRange = (typeof STATS_RANGES)[number];

export function isStatsRange(value: unknown): value is StatsRange {
  return typeof value === "string" && (STATS_RANGES as readonly string[]).includes(value);
}
