import Link from "next/link";
import { History } from "lucide-react";
import { HISTORY_TOOLS, isHistoryTool } from "@/lib/history";
import { describeRun } from "@/lib/history-display";
import { formatDate } from "@/lib/blog";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { ClearHistoryButton, RunActions } from "./RunActions";

export const metadata = { title: "Tool History" };

const PER_PAGE = 10;

type SearchParams = Promise<{ tool?: string; page?: string }>;

export default async function ToolHistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const session = (await getSessionUser())!;
  const sp = await searchParams;
  const tool = isHistoryTool(sp.tool) ? sp.tool : HISTORY_TOOLS[0].id;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const toolLabel = HISTORY_TOOLS.find((t) => t.id === tool)!.label;

  const [runs, total, counts] = await Promise.all([
    prisma.toolRun.findMany({
      where: { userId: session.id, tool },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: { id: true, title: true, input: true, updatedAt: true },
    }),
    prisma.toolRun.count({ where: { userId: session.id, tool } }),
    prisma.toolRun.groupBy({ by: ["tool"], where: { userId: session.id }, _count: { _all: true } }),
  ]);
  const countByTool = new Map(counts.map((c) => [c.tool, c._count._all]));
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Tool history</h2>
        <p className="text-sm text-muted-foreground">
          Runs you make while signed in are saved here. <strong className="font-semibold">Edit</strong> opens the tool in a new tab with your saved inputs and result, ready to change and run again.
        </p>
      </div>

      <div role="tablist" aria-label="Tools" className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1">
        {HISTORY_TOOLS.map((t) => {
          const active = t.id === tool;
          const count = countByTool.get(t.id) ?? 0;
          return (
            <Link
              key={t.id}
              href={`/dashboard/tools?tool=${t.id}`}
              role="tab"
              aria-selected={active}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                active ? "border border-border/60 bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {count > 0 && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{count}</span>}
            </Link>
          );
        })}
      </div>

      {runs.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <History className="mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="mb-1 font-semibold text-foreground">No {toolLabel} history yet</p>
          <p className="mb-5 text-sm text-muted-foreground">Your runs will show up here as you use the tool.</p>
          <Link href={`/tools/${tool}`} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
            Open {toolLabel}
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{total} saved run{total === 1 ? "" : "s"}</p>
            <ClearHistoryButton tool={tool} label={toolLabel} />
          </div>
          <ul className="space-y-3">
            {runs.map((run) => (
              <li key={run.id} className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-semibold text-foreground">{run.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(run.updatedAt)}
                    {describeRun(tool, run.input) && <> · {describeRun(tool, run.input)}</>}
                  </p>
                </div>
                <RunActions id={run.id} tool={tool} />
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={`/dashboard/tools?tool=${tool}${n > 1 ? `&page=${n}` : ""}`}
                  aria-current={n === page ? "page" : undefined}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${n === page ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {n}
                </Link>
              ))}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
