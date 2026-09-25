"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Trash2, TriangleAlert } from "lucide-react";
import { clearResolvedErrors, deleteError, setErrorResolved } from "./actions";

export interface ErrorRow {
  id: string;
  source: string;
  message: string;
  stack: string | null;
  route: string | null;
  count: number;
  resolved: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
}

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function ErrorTable({ errors }: { errors: ErrorRow[] }) {
  const [rows, setRows] = useState(errors);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"open" | "resolved">("open");

  const visible = rows.filter((r) => (tab === "open" ? !r.resolved : r.resolved));

  function toggle(id: string, resolved: boolean) {
    startTransition(async () => {
      await setErrorResolved(id, resolved);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, resolved } : r)));
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this error?")) return;
    startTransition(async () => {
      await deleteError(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    });
  }

  function clearResolved() {
    if (!confirm("Delete all resolved errors?")) return;
    startTransition(async () => {
      await clearResolvedErrors();
      setRows((prev) => prev.filter((r) => !r.resolved));
    });
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-xl bg-muted border border-border">
          {(["open", "resolved"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors ${tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {t} ({rows.filter((r) => (t === "open" ? !r.resolved : r.resolved)).length})
            </button>
          ))}
        </div>
        {tab === "resolved" && visible.length > 0 && (
          <button onClick={clearResolved} disabled={pending} className="px-3.5 py-1.5 rounded-lg text-sm font-semibold border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 disabled:opacity-50">
            Clear resolved
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="p-10 text-center text-sm text-muted-foreground">{tab === "open" ? "No open errors. 🎉" : "No resolved errors."}</p>
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((r) => {
            const open = openId === r.id;
            return (
              <li key={r.id} className="p-4">
                <div className="flex items-start gap-3">
                  <button onClick={() => setOpenId(open ? null : r.id)} aria-label="Toggle details" className="mt-0.5 text-muted-foreground hover:text-foreground">
                    {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <TriangleAlert className={`w-4 h-4 mt-0.5 shrink-0 ${r.resolved ? "text-muted-foreground" : "text-rose-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground break-words">{r.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="uppercase font-bold">{r.source}</span>
                      {r.route ? ` · ${r.route}` : ""} · {r.count}× · first {fmt(r.firstSeenAt)} · last {fmt(r.lastSeenAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggle(r.id, !r.resolved)} disabled={pending} title={r.resolved ? "Reopen" : "Mark resolved"} className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-50">
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(r.id)} disabled={pending} title="Delete" className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 disabled:opacity-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {open && (
                  <pre className="mt-3 ml-11 max-h-72 overflow-auto rounded-lg bg-muted/50 p-3 text-xs leading-relaxed whitespace-pre-wrap break-words">{r.stack ?? "No stack trace recorded."}</pre>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
