"use client";

import { useEffect, useRef, useState } from "react";
import { History, X } from "lucide-react";

interface HistoryItem {
  id: string;
  tool: string;
  label: string;
  title: string;
  updatedAt: string;
  inputText: string | null;
  resultText: string | null;
}

type FetchState = "idle" | "loading" | "error" | "signin";

/** Lets a tool's textarea pull in the input or result text of one of the user's previous runs, from any tool. */
export function InsertFromHistoryButton({ onInsert }: { onInsert: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [state, setState] = useState<FetchState>("idle");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const load = async () => {
    setOpen((v) => !v);
    if (items) return;
    setState("loading");
    try {
      const res = await fetch("/api/history/recent");
      if (res.status === 401) {
        setState("signin");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setState("idle");
    } catch {
      setState("error");
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={load}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <History className="w-3.5 h-3.5" />
        Insert from history
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-border bg-card shadow-xl p-2">
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <span className="text-xs font-bold text-foreground">Pull from a previous run</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close">
              <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>

          {state === "loading" && <p className="px-2 py-3 text-xs text-muted-foreground">Loading…</p>}
          {state === "signin" && <p className="px-2 py-3 text-xs text-muted-foreground">Sign in to reuse a previous run.</p>}
          {state === "error" && <p className="px-2 py-3 text-xs text-red-500">Couldn&rsquo;t load your history. Try again.</p>}
          {items && items.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">No previous runs with reusable text yet.</p>}

          {items?.map((item) => (
            <div key={item.id} className="rounded-lg px-2 py-2 hover:bg-muted/50">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground truncate">{item.title}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{item.label}</span>
              </div>
              <div className="mt-1.5 flex gap-2">
                {item.inputText && (
                  <button
                    type="button"
                    onClick={() => {
                      onInsert(item.inputText!);
                      setOpen(false);
                    }}
                    className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                  >
                    Use Input
                  </button>
                )}
                {item.resultText && (
                  <button
                    type="button"
                    onClick={() => {
                      onInsert(item.resultText!);
                      setOpen(false);
                    }}
                    className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                  >
                    Use Result
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
