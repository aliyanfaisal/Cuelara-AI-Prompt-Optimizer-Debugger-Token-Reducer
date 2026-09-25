import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session-user";
import { getTeamAnalytics } from "@/lib/team-analytics";
import { listWorkspaces } from "@/lib/workspace";
import { UsageChart } from "./UsageChart";

export const metadata = { title: "Team analytics" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ w?: string; days?: string }>;

export default async function TeamAnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = (await getSessionUser())!;
  const sp = await searchParams;
  const managed = (await listWorkspaces(session.id)).filter((w) => w.type === "team" && (w.role === "OWNER" || w.role === "ADMIN"));
  if (managed.length === 0) redirect("/dashboard/team");
  const team = managed.find((t) => t.id === sp.w) ?? managed[0];
  const days = sp.days === "30" ? 30 : 7;

  const a = (await getTeamAnalytics(session.id, team.id, days))!;
  const active = a.byMember.filter((m) => m.runs > 0).length;
  const tiles = [
    { label: "Total runs", value: a.totalRuns.toLocaleString() },
    { label: "Avg runs / day", value: String(a.avgPerDay) },
    { label: "Active members", value: `${active} of ${a.memberCount}` },
    { label: "Seats", value: `${a.seats.used} / ${a.seats.max}${a.seats.pending ? ` (+${a.seats.pending} invited)` : ""}` },
  ];
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/team" className="text-xs font-semibold text-primary hover:underline">← Team</Link>
          <h2 className="mt-1 text-xl font-bold text-foreground">Usage analytics · {team.name}</h2>
          <p className="text-sm text-muted-foreground">How your team uses the tools. Counts only — prompts and results are never shown here, and each person is counted from the day they joined.</p>
        </div>
        <div className="inline-flex rounded-xl border border-border bg-muted p-1" role="tablist" aria-label="Range">
          {[7, 30].map((d) => (
            <Link key={d} href={`/dashboard/team/analytics?w=${team.id}&days=${d}`} role="tab" aria-selected={days === d} className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${days === d ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {d} days
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.label}</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-foreground">{t.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-4 font-bold text-foreground">Runs per day</h3>
        {a.totalRuns === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No tool runs in this period yet.</p> : <UsageChart data={a.daily} />}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 font-bold text-foreground">By member</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr><th className="pb-2">Member</th><th className="pb-2 text-right">Runs</th><th className="pb-2 pl-4">Top tool</th><th className="pb-2 text-right">Last active</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {a.byMember.map((m) => (
                  <tr key={m.userId}>
                    <td className="max-w-[10rem] truncate py-2 font-semibold text-foreground">{m.name || m.email}</td>
                    <td className="py-2 text-right tabular-nums">{m.runs}</td>
                    <td className="py-2 pl-4 text-muted-foreground">{m.topTool ?? "—"}</td>
                    <td className="py-2 text-right text-muted-foreground">{fmt(m.lastActive)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 font-bold text-foreground">By tool</h3>
          {a.byTool.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {a.byTool.map((t) => (
                <li key={t.tool}>
                  <div className="flex items-center justify-between text-sm"><span className="text-foreground">{t.label}</span><span className="font-semibold tabular-nums">{t.runs}</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((t.runs / a.byTool[0].runs) * 100)}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {a.pool.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-1 font-bold text-foreground">Shared pool today</h3>
          <p className="mb-3 text-xs text-muted-foreground">Runs the whole team shares each UTC day. A tool at its limit is unavailable to everyone until tomorrow.</p>
          <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {a.pool.map((p) => (
              <li key={p.tool} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{p.label}</span>
                <span className={`font-semibold tabular-nums ${p.used >= p.limit ? "text-rose-500" : "text-foreground"}`}>{p.used} / {p.limit}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
