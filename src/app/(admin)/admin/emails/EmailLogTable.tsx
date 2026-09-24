"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, Mail, Search } from "lucide-react";

export interface EmailLogRow {
  id: string;
  type: string;
  to: string;
  subject: string;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  activation: "Activation",
  "password-reset": "Password reset",
  "plan-change": "Plan change",
  contact: "Contact form",
};

export default function EmailLogTable({ logs, types }: { logs: EmailLogRow[]; types: string[] }) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (typeFilter !== "all" && log.type !== typeFilter) return false;
      if (statusFilter === "success" && !log.success) return false;
      if (statusFilter === "failed" && log.success) return false;
      if (search && !log.to.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [logs, typeFilter, statusFilter, search]);

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-border flex flex-wrap items-center gap-3">
        <div className="flex items-center bg-background border border-border rounded-lg px-3 py-2 max-w-xs w-full">
          <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search by recipient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none focus:outline-none w-full text-xs"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-xs font-medium"
        >
          <option value="all">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t] ?? t}
            </option>
          ))}
        </select>

        <div className="inline-flex p-1 rounded-lg bg-muted border border-border">
          {(["all", "success", "failed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
                statusFilter === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} shown</span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Mail className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No emails match this filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase font-semibold">
              <tr>
                <th className="p-3.5">Time</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">To</th>
                <th className="p-3.5">Subject</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((log) => (
                <tr key={log.id}>
                  <td className="p-3.5 text-muted-foreground whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md bg-muted text-foreground font-medium">{TYPE_LABELS[log.type] ?? log.type}</span>
                  </td>
                  <td className="p-3.5 font-mono text-foreground whitespace-nowrap">{log.to}</td>
                  <td className="p-3.5 text-muted-foreground max-w-xs truncate" title={log.subject}>
                    {log.subject}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    {log.success ? (
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sent
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                        <XCircle className="w-3.5 h-3.5" /> Failed
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-muted-foreground max-w-sm truncate" title={log.errorMessage ?? undefined}>
                    {log.errorMessage ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
