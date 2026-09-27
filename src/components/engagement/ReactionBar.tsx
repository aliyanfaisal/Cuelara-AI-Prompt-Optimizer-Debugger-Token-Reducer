"use client";

import { useEffect, useRef, useState } from "react";
import { REACTION_META, REACTION_TYPES } from "@/lib/reactions";
import type { ReactionSummary } from "@/lib/reactions";

type ReactionType = (typeof REACTION_TYPES)[number];
type Subject = "blog" | "cookbook";

export function ReactionBar({ subject, subjectId, initial }: { subject: Subject; subjectId: string; initial: ReactionSummary }) {
  const [summary, setSummary] = useState(initial);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [pickerOpen]);

  async function react(type: ReactionType | null) {
    setPickerOpen(false);
    if (pending) return;
    setPending(true);
    const previous = summary;
    // Optimistic update so the click feels instant.
    setSummary((s) => {
      const counts = { ...s.counts };
      if (s.mine) counts[s.mine] -= 1;
      if (type) counts[type] += 1;
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return { counts, total, mine: type };
    });

    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, subjectId, type }),
      });
      if (!res.ok) throw new Error("request failed");
      setSummary(await res.json());
    } catch {
      setSummary(previous);
    } finally {
      setPending(false);
    }
  }

  function onMainClick() {
    if (summary.mine) {
      react(null);
    } else {
      setPickerOpen((v) => !v);
    }
  }

  const topReactions = REACTION_TYPES.map((type) => ({ type, count: summary.counts[type] }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  const mineMeta = summary.mine ? REACTION_META[summary.mine] : null;

  return (
    <div className="flex flex-wrap items-center gap-4">
      {topReactions.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex -space-x-1">
            {topReactions.slice(0, 3).map((r) => (
              <span
                key={r.type}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-sm shadow-sm"
                title={REACTION_META[r.type].label}
              >
                {REACTION_META[r.type].emoji}
              </span>
            ))}
          </div>
          <span className="font-medium text-foreground">{summary.total.toLocaleString()}</span>
        </div>
      )}

      <div ref={containerRef} className="relative">
        {pickerOpen && (
          <div className="absolute bottom-full left-0 mb-2 flex items-center gap-1 rounded-full border border-border bg-card p-1.5 shadow-lg">
            {REACTION_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => react(type)}
                title={REACTION_META[type].label}
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition-transform hover:scale-125"
              >
                {REACTION_META[type].emoji}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onMainClick}
          onMouseEnter={() => setPickerOpen(true)}
          disabled={pending}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
            mineMeta ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          <span className="text-base">{mineMeta?.emoji ?? "👍"}</span>
          {mineMeta?.label ?? "Like"}
        </button>
      </div>
    </div>
  );
}
