"use client";

import { useState, useTransition } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import { Activity, CheckCircle2, XCircle, Percent, RefreshCcw, AlertTriangle, ShieldCheck } from "lucide-react";
import { getApiCallStats, resetApiCallStats, type ApiCallStats } from "./actions";
import { STATS_RANGES, type StatsRange } from "./constants";
import { PROVIDER_LABELS, PROVIDER_CHART_COLORS, isProvider } from "@/lib/providers";

const RANGE_LABELS: Record<StatsRange, string> = {
  day: "Last 24 Hours",
  week: "Last 7 Days",
  month: "Last 30 Days",
  custom: "Custom Range",
};

/** yyyy-MM-ddThh:mm, what a `datetime-local` input needs — local time, no timezone/seconds. */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TOOLTIP_STYLE = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
};
const TOOLTIP_LABEL_STYLE = { color: "var(--foreground)", fontWeight: 700, marginBottom: 4 };
const TOOLTIP_ITEM_STYLE = { color: "var(--muted-foreground)" };
const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 11 };

function seriesName(key: string): string {
  return key === "success" ? "Successful" : key === "failure" ? "Failed" : key;
}

function providerLabel(provider: string): string {
  return isProvider(provider) ? PROVIDER_LABELS[provider] : provider;
}

function providerColor(provider: string): string {
  return isProvider(provider) ? PROVIDER_CHART_COLORS[provider] : "var(--chart-cat-1)";
}

function EmptyState({ icon: Icon, text }: { icon: typeof Activity; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
      <Icon className="w-8 h-8 mb-2 opacity-50" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export default function AnalyticsDashboard({ initialStats }: { initialStats: ApiCallStats }) {
  const [stats, setStats] = useState(initialStats);
  const [range, setRange] = useState<StatsRange>(initialStats.range);
  const [customFrom, setCustomFrom] = useState(() => toLocalInputValue(initialStats.from));
  const [customTo, setCustomTo] = useState(() => toLocalInputValue(initialStats.to));
  const [isPending, startTransition] = useTransition();

  function handleRangeChange(next: StatsRange) {
    if (next === "custom") {
      setRange("custom");
      return; // wait for "Apply" — a preset range's dates aren't chosen yet
    }
    if (next === range) return;
    setRange(next);
    startTransition(async () => {
      const data = await getApiCallStats(next);
      setStats(data);
      setCustomFrom(toLocalInputValue(data.from));
      setCustomTo(toLocalInputValue(data.to));
    });
  }

  const customRangeValid = customFrom !== "" && customTo !== "" && new Date(customFrom).getTime() < new Date(customTo).getTime();

  function handleApplyCustomRange() {
    if (!customRangeValid) return;
    startTransition(async () => {
      const data = await getApiCallStats("custom", new Date(customFrom).toISOString(), new Date(customTo).toISOString());
      setStats(data);
      setRange("custom");
    });
  }

  function handleReset() {
    if (!confirm("Reset analytics? This permanently deletes every logged API call and cannot be undone.")) return;
    startTransition(async () => {
      const result = await resetApiCallStats();
      if ("error" in result) {
        alert(result.error);
        return;
      }
      setStats(await getApiCallStats(range === "custom" ? "day" : range));
      if (range === "custom") setRange("day");
    });
  }

  const successRate = stats.totalCalls > 0 ? Math.round((stats.successCount / stats.totalCalls) * 100) : 100;
  const xAxisInterval =
    range === "day" ? 2 : range === "month" ? 3 : range === "custom" ? Math.max(0, Math.floor(stats.timeSeries.length / 10)) : 0;

  const rangeDescription =
    range === "custom"
      ? `${new Date(stats.from).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} – ${new Date(
          stats.to
        ).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
      : RANGE_LABELS[range];

  const tiles = [
    { name: "Total Calls", value: stats.totalCalls.toLocaleString(), icon: Activity, color: "text-blue-500", bg: "bg-blue-500/10" },
    { name: "Successful", value: stats.successCount.toLocaleString(), icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { name: "Failed", value: stats.failureCount.toLocaleString(), icon: XCircle, color: "text-rose-500", bg: "bg-rose-500/10" },
    { name: "Success Rate", value: `${successRate}%`, icon: Percent, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  const modelChartHeight = Math.max(140, stats.byModel.length * 52);
  const providerChartHeight = Math.max(140, stats.byProvider.length * 52);
  const presentProviders = Array.from(new Set(stats.byModel.map((m) => m.provider)));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex p-1 rounded-xl bg-muted border border-border">
          {STATS_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => handleRangeChange(r)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                range === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {isPending && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
              Updating...
            </span>
          )}
          <button
            onClick={handleReset}
            disabled={isPending}
            className="px-3.5 py-1.5 rounded-lg text-sm font-semibold border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
          >
            Reset analytics
          </button>
        </div>
      </div>

      {range === "custom" && (
        <div className="flex flex-wrap items-end gap-3 -mt-4">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground font-medium">From</span>
            <input
              type="datetime-local"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground focus-visible:outline-none focus-visible:border-primary/50"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground font-medium">To</span>
            <input
              type="datetime-local"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground focus-visible:outline-none focus-visible:border-primary/50"
            />
          </label>
          <button
            onClick={handleApplyCustomRange}
            disabled={!customRangeValid || isPending}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply
          </button>
          {!customRangeValid && <span className="text-xs text-rose-500">Pick a “From” before the “To” date.</span>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((stat) => (
          <div key={stat.name} className="glass-card rounded-2xl p-6 transition-all hover:scale-[1.02]">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-bold text-foreground mb-1">Calls Over Time</h3>
        <p className="text-sm text-muted-foreground mb-4">{rangeDescription} — successful vs. failed calls</p>
        {stats.totalCalls === 0 ? (
          <EmptyState icon={Activity} text="No API calls logged in this range yet." />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.timeSeries} barGap={0} barCategoryGap={range === "day" ? "10%" : "20%"}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={AXIS_TICK}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
                interval={xAxisInterval}
              />
              <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={32} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
                formatter={(value, key) => [value, seriesName(String(key))]}
                cursor={{ fill: "var(--muted)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
              <Bar dataKey="success" name="Successful" stackId="calls" fill="var(--chart-success)" />
              <Bar dataKey="failure" name="Failed" stackId="calls" fill="var(--chart-failure)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-bold text-foreground mb-1">Usage by Provider</h3>
          <p className="text-sm text-muted-foreground mb-4">Which key pool is absorbing traffic, and how often it fails</p>
          {stats.byProvider.length === 0 ? (
            <EmptyState icon={Activity} text="No provider calls logged in this range yet." />
          ) : (
            <ResponsiveContainer width="100%" height={providerChartHeight}>
              <BarChart data={stats.byProvider} layout="vertical" barGap={0} barCategoryGap="30%">
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="provider"
                  tickFormatter={providerLabel}
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  labelFormatter={(label) => providerLabel(String(label))}
                  formatter={(value, key) => [value, seriesName(String(key))]}
                  cursor={{ fill: "var(--muted)" }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
                <Bar dataKey="success" name="Successful" stackId="p" fill="var(--chart-success)" barSize={22} />
                <Bar dataKey="failure" name="Failed" stackId="p" fill="var(--chart-failure)" barSize={22} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-bold text-foreground mb-1">Usage by Model</h3>
          <p className="text-sm text-muted-foreground mb-4">Total calls per model, colored by provider</p>
          {stats.byModel.length === 0 ? (
            <EmptyState icon={Activity} text="No model calls logged in this range yet." />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={modelChartHeight}>
                <BarChart data={stats.byModel} layout="vertical" barGap={0} barCategoryGap="30%">
                  <CartesianGrid stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                  <YAxis type="category" dataKey="model" tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false} tickLine={false} width={130} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                    itemStyle={TOOLTIP_ITEM_STYLE}
                    formatter={(value, key, item) => {
                      const payload = item?.payload as { provider?: string } | undefined;
                      if (key === "total" && payload?.provider) {
                        return [value, `Total (${providerLabel(payload.provider)})`];
                      }
                      return [value, seriesName(String(key))];
                    }}
                    cursor={{ fill: "var(--muted)" }}
                  />
                  <Bar dataKey="total" name="Total calls" radius={[0, 4, 4, 0]} barSize={22}>
                    {stats.byModel.map((m) => (
                      <Cell key={`${m.provider}-${m.model}`} fill={providerColor(m.provider)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-border">
                {presentProviders.map((p) => (
                  <span key={p} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: providerColor(p) }} />
                    {providerLabel(p)}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Recent Failed Calls
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{rangeDescription} — most recent first, up to 50</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            {stats.recentFailures.length} shown
          </span>
        </div>

        {stats.recentFailures.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={ShieldCheck} text="No failed calls in this range — every attempt succeeded." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="p-3.5">Time</th>
                  <th className="p-3.5">Tool</th>
                  <th className="p-3.5">Provider</th>
                  <th className="p-3.5">Model</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.recentFailures.map((f) => (
                  <tr key={f.id}>
                    <td className="p-3.5 text-muted-foreground whitespace-nowrap">{new Date(f.createdAt).toLocaleString()}</td>
                    <td className="p-3.5 font-semibold text-foreground whitespace-nowrap">{f.tool}</td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: providerColor(f.provider) }} />
                        {providerLabel(f.provider)}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-muted-foreground whitespace-nowrap">{f.model}</td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        {f.statusCode ?? "—"}
                      </span>
                    </td>
                    <td className="p-3.5 text-muted-foreground max-w-md truncate" title={f.errorMessage ?? undefined}>
                      {f.errorMessage ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
