import Link from "next/link";
import { ArrowRight, BarChart3, CreditCard, Flame, History, Zap } from "lucide-react";
import { getDashboardStats } from "@/lib/dashboard";
import { formatDate } from "@/lib/blog";
import { getSessionUser } from "@/lib/session-user";

export const metadata = { title: "Dashboard" };

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Zap; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-black tracking-tight text-foreground">{value}</p>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const session = (await getSessionUser())!;
  const stats = await getDashboardStats(session.id);
  const peak = Math.max(1, ...stats.activity.map((a) => a.count));
  const topTool = stats.perTool[0];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Zap} label="Runs today" value={String(stats.runsToday)} hint="Across all tools (UTC day)" />
        <Stat icon={BarChart3} label="Saved runs, last 7 days" value={String(stats.runsThisWeek)} />
        <Stat icon={History} label="Saved runs, total" value={String(stats.totalRuns)} hint={topTool ? `Most used: ${topTool.label}` : undefined} />
        <Link href="/dashboard/subscription" className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CreditCard className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black tracking-tight text-foreground">{stats.planName ?? "No plan"}</p>
          <p className="text-sm font-medium text-muted-foreground">Your plan</p>
          <p className="mt-1 text-xs font-semibold text-primary">Manage subscription</p>
        </Link>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-1 text-lg font-bold text-foreground">Activity</h2>
        <p className="mb-6 text-sm text-muted-foreground">Runs saved to your history over the last 7 days.</p>
        <div className="flex h-40 items-end gap-3" role="img" aria-label={`Runs per day: ${stats.activity.map((a) => `${a.label} ${a.count}`).join(", ")}`}>
          {stats.activity.map((a) => (
            <div key={a.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="text-xs font-semibold text-foreground">{a.count || ""}</span>
              <div className="w-full rounded-t-lg bg-primary/80" style={{ height: `${Math.max(a.count ? 6 : 2, (a.count / peak) * 100)}%`, opacity: a.count ? 1 : 0.2 }} />
              <span className="text-[11px] font-medium text-muted-foreground">{a.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-1 text-lg font-bold text-foreground">Today&apos;s usage</h2>
          <p className="mb-5 text-sm text-muted-foreground">Your daily limits reset at midnight UTC.</p>
          <ul className="space-y-4">
            {stats.usage.map((u) => {
              const pct = u.limit > 0 ? Math.min(100, (u.used / u.limit) * 100) : 0;
              return (
                <li key={u.id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{u.label}</span>
                    <span className="tabular-nums text-muted-foreground">{u.used} / {u.limit}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={u.used} aria-valuemin={0} aria-valuemax={u.limit} aria-label={`${u.label} usage`}>
                    <div className={`h-full rounded-full ${pct >= 100 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="space-y-8">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-foreground"><Flame className="h-4 w-4 text-primary" /> Your most used tools</h2>
            {stats.perTool.length === 0 ? (
              <p className="text-sm text-muted-foreground">Run a tool while signed in and it will show up here.</p>
            ) : (
              <ul className="space-y-3">
                {stats.perTool.slice(0, 5).map((t) => (
                  <li key={t.id}>
                    <Link href={`/dashboard/tools?tool=${t.id}`} className="group flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground group-hover:text-primary">{t.label}</span>
                      <span className="tabular-nums text-muted-foreground">{t.count} run{t.count === 1 ? "" : "s"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Recent runs</h2>
              <Link href="/dashboard/tools" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                All history <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {stats.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing here yet. <Link href="/tools" className="font-semibold text-primary hover:underline">Try a tool</Link> and your runs will be saved.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {stats.recent.map((r) => (
                  <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                    <a href={`/tools/${r.tool}?run=${r.id}`} target="_blank" rel="noopener" className="block">
                      <p className="line-clamp-1 text-sm font-medium text-foreground hover:text-primary">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.toolLabel} · {formatDate(r.updatedAt)}</p>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
