"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { downgradePlan, requestUpgrade } from "../actions";

export function PlanActions({ planId, planName, kind, requested, historyPerTool }: { planId: string; planName: string; kind: "upgrade" | "downgrade"; requested: boolean; historyPerTool: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok?: string; error?: string }>({});

  function run() {
    if (kind === "downgrade" && !confirm(`Switch to the ${planName} plan now?\n\nYour daily limits change immediately, and your history is trimmed to the latest ${historyPerTool} runs per tool. Older saved runs are deleted and can't be recovered.`)) return;
    setFeedback({});
    startTransition(async () => {
      const result = kind === "upgrade" ? await requestUpgrade(planId) : await downgradePlan(planId);
      if ("error" in result) return setFeedback({ error: result.error });
      setFeedback({ ok: result.message });
      router.refresh();
    });
  }

  if (kind === "upgrade" && (requested || feedback.ok)) {
    return (
      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4" /> {feedback.ok ?? "Upgrade requested. We'll be in touch."}
      </p>
    );
  }

  return (
    <div>
      <button
        onClick={run}
        disabled={pending}
        className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-colors disabled:opacity-60 ${
          kind === "upgrade" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border bg-background text-foreground hover:bg-muted"
        }`}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {kind === "upgrade" ? `Request ${planName}` : `Downgrade to ${planName}`}
      </button>
      {feedback.error && <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">{feedback.error}</p>}
    </div>
  );
}
