import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { HISTORY_TOOLS, isHistoryTool, historyToolLabel } from "@/lib/history";
import { describeRun } from "@/lib/history-display";
import { getSessionUser } from "@/lib/session-user";
import { listTeamRuns } from "@/lib/team-history";
import { listWorkspaces } from "@/lib/workspace";

export const metadata = { title: "Team activity" };

const PER_PAGE = 15;
type SearchParams = Promise<{ w?: string; tool?: string; member?: string; page?: string }>;

const when = (d: Date) => d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default async function TeamActivityPage({ searchParams }: { searchParams: SearchParams }) {
  const session = (await getSessionUser())!;
  const sp = await searchParams;
  const teams = (await listWorkspaces(session.id)).filter((w) => w.type === "team");
  if (teams.length === 0) redirect("/dashboard/team");
  const team = teams.find((t) => t.id === sp.w) ?? teams[0];

  const tool = isHistoryTool(sp.tool) ? sp.tool : undefined;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const data = (await listTeamRuns(session.id, team.id, { tool, memberId: sp.member || undefined, skip: (page - 1) * PER_PAGE, take: PER_PAGE }))!;
  const totalPages = Math.max(1, Math.ceil(data.total / PER_PAGE));

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ w: team.id });
    const merged = { tool, member: sp.member, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/dashboard/team/activity?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/team" className="text-xs font-semibold text-primary hover:underline">← Team</Link>
        <h2 className="mt-1 text-xl font-bold text-foreground">Team activity{teams.length > 1 ? ` · ${team.name}` : ""}</h2>
        <p className="text-sm text-muted-foreground">
          Recent tool runs from teammates who share their history. <strong className="font-semibold">Open</strong> loads the run in its tool so you can reuse or change it; your own runs aren&rsquo;t affected.
        </p>
      </div>

      {teams.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {teams.map((t) => (
            <Link key={t.id} href={`/dashboard/team/activity?w=${t.id}`} className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${t.id === team.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
              {t.name}
            </Link>
          ))}
        </div>
      )}

      {!data.enabled ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">The team owner has switched shared history off.</div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">Tool:</span>
            <Link href={qs({ tool: undefined, page: undefined })} className={`rounded-full border px-3 py-1 font-semibold ${!tool ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>All</Link>
            {HISTORY_TOOLS.map((t) => (
              <Link key={t.id} href={qs({ tool: t.id, page: undefined })} className={`rounded-full border px-3 py-1 font-semibold ${tool === t.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{t.label}</Link>
            ))}
          </div>
          {data.members.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-muted-foreground">Person:</span>
              <Link href={qs({ member: undefined, page: undefined })} className={`rounded-full border px-3 py-1 font-semibold ${!sp.member ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>Everyone</Link>
              {data.members.map((m) => (
                <Link key={m.id} href={qs({ member: m.id, page: undefined })} className={`rounded-full border px-3 py-1 font-semibold ${sp.member === m.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{m.name}</Link>
              ))}
            </div>
          )}

          {data.runs.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
              <Users className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="mb-1 font-semibold text-foreground">Nothing shared yet</p>
              <p className="text-sm text-muted-foreground">Runs appear here as teammates use the tools while signed in.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.runs.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{r.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.memberId === session.id ? "You" : r.memberName} · {historyToolLabel(r.tool)}
                      {describeRun(r.tool, r.input) && <> · {describeRun(r.tool, r.input)}</>} · {when(r.updatedAt)}
                    </p>
                  </div>
                  <Link href={`/tools/${r.tool}?run=${r.id}`} target="_blank" className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">Open</Link>
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
              {page > 1 ? <Link href={qs({ page: String(page - 1) })} className="font-semibold text-primary hover:underline">← Newer</Link> : <span />}
              <span className="text-muted-foreground">Page {page} of {totalPages}</span>
              {page < totalPages ? <Link href={qs({ page: String(page + 1) })} className="font-semibold text-primary hover:underline">Older →</Link> : <span />}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
