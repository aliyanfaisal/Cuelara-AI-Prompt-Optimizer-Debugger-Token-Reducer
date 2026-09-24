"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, Loader2, TriangleAlert } from "lucide-react";

export interface SavedRun<I, R> {
  id: string;
  tool: string;
  title: string;
  input: I;
  result: R;
}

export type SavedRunState<I, R> =
  | { status: "none" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; run: SavedRun<I, R> };

export interface SavedRunHandle<I, R> {
  state: SavedRunState<I, R>;
  /** The loaded run (undefined until it is ready). Tool pages hydrate their inputs and result from this. */
  run: SavedRun<I, R> | undefined;
}

/**
 * Loads the saved run named by `?run=<id>`, which the dashboard's history "Edit" action opens in a new tab.
 * The tool page then shows the saved inputs and result directly, without calling the tool, and sends the
 * run's id with its next submission so the run is updated instead of duplicated.
 * The id is read in an effect rather than with useSearchParams, so the page stays statically renderable.
 */
export function useSavedRun<I = unknown, R = unknown>(tool: string): SavedRunHandle<I, R> {
  const [state, setState] = useState<SavedRunState<I, R>>({ status: "none" });

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("run");
    if (!id) return;

    let cancelled = false;
    setState({ status: "loading" });
    fetch(`/api/history/${encodeURIComponent(id)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) return setState({ status: "error", error: data.error ?? "Could not open this history item." });
        if (data.tool !== tool) return setState({ status: "error", error: "This history item belongs to a different tool." });
        setState({ status: "ready", run: data as SavedRun<I, R> });
      })
      .catch(() => !cancelled && setState({ status: "error", error: "Network error: could not open this history item." }));

    return () => {
      cancelled = true;
    };
  }, [tool]);

  return { state, run: state.status === "ready" ? state.run : undefined };
}

/** Explains that the page is showing a saved run, or why it could not be opened. */
export function SavedRunBanner<I, R>({ saved, tool }: { saved: SavedRunHandle<I, R>; tool: string }) {
  const { state } = saved;
  if (state.status === "none") return null;

  if (state.status === "loading") {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground" role="status">
        <Loader2 className="h-4 w-4 animate-spin" /> Opening your saved run...
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-400" role="alert">
        <TriangleAlert className="h-4 w-4 shrink-0" /> {state.error}
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground" role="status">
      <History className="h-4 w-4 shrink-0 text-primary" />
      <span>
        <strong>Opened from your history.</strong> This is your saved result. Change anything and run it again to update this item.
      </span>
      <Link href={`/dashboard/tools?tool=${tool}`} className="ml-auto text-xs font-semibold text-primary hover:underline">
        Back to history
      </Link>
    </div>
  );
}
