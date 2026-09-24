"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import { clearToolHistory, deleteToolRun } from "../actions";

export function RunActions({ id, tool }: { id: string; tool: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    if (!confirm("Delete this item from your history? This can't be undone.")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteToolRun(id);
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {/* A new tab keeps the history list where it was; the tool shows the saved result without running again. */}
        <a
          href={`/tools/${tool}?run=${id}`}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Edit
        </a>
        <button
          onClick={remove}
          disabled={pending}
          aria-label="Delete"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-500/10 disabled:opacity-50 dark:text-rose-400"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}

export function ClearHistoryButton({ tool, label }: { tool: string; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function clear() {
    if (!confirm(`Delete all of your ${label} history? This can't be undone.`)) return;
    startTransition(async () => {
      await clearToolHistory(tool);
      router.refresh();
    });
  }

  return (
    <button onClick={clear} disabled={pending} className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50 dark:text-rose-400">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Clear all
    </button>
  );
}
