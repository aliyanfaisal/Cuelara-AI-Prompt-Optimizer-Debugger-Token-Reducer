"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { History, X } from "lucide-react";

interface HistoryItem {
  id: string;
  kind: "run" | "saved";
  tool: string;
  label: string;
  title: string;
  updatedAt: string;
  inputText: string | null;
  resultText: string | null;
}

type FetchState = "idle" | "loading" | "error" | "signin";

const PANEL_WIDTH = 320;
const VIEWPORT_MARGIN = 12;

/** Lets a tool's textarea pull in the input or result text of one of the user's previous runs, from any tool. */
export function InsertFromHistoryButton({ onInsert }: { onInsert: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [savedItems, setSavedItems] = useState<HistoryItem[] | null>(null);
  const [state, setState] = useState<FetchState>("idle");
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Rendered in a portal (see below) so an ancestor `overflow-hidden` card never clips it —
  // position is computed from the trigger button's real screen location instead of CSS `absolute`.
  const reposition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(Math.max(rect.left, VIEWPORT_MARGIN), window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN);
    setPosition({ top: rect.bottom + 8, left });
  };

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
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
      setSavedItems(Array.isArray(data.savedItems) ? data.savedItems : []);
      setState("idle");
    } catch {
      setState("error");
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={load}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <History className="w-3.5 h-3.5" />
        Insert from history
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: position.top, left: position.left, width: PANEL_WIDTH }}
            className="fixed z-50 max-h-96 overflow-y-auto rounded-xl border border-border bg-card shadow-xl p-2"
          >
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

            {savedItems && savedItems.length > 0 && (
              <>
                <div className="mt-2 border-t border-border px-2 pt-2 pb-1">
                  <span className="text-xs font-bold text-foreground">From your workspace</span>
                </div>
                {savedItems.map((item) => (
                  <div key={item.id} className="rounded-lg px-2 py-2 hover:bg-muted/50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground truncate">{item.title}</span>
                    </div>
                    <div className="mt-1.5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onInsert(item.resultText!);
                          setOpen(false);
                        }}
                        className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                      >
                        Use Prompt
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
