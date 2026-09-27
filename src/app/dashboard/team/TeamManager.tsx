"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createTeam } from "./actions";

type ActionResult = { success: true; message?: string } | { error: string };

/** Runs a server action, surfaces its result, and refreshes the server-rendered lists. */
function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok?: string; error?: string }>({});

  function run(action: () => Promise<ActionResult>, after?: () => void) {
    setFeedback({});
    startTransition(async () => {
      const result = await action();
      if ("error" in result) return setFeedback({ error: result.error });
      setFeedback(result.message ? { ok: result.message } : {});
      after?.();
      router.refresh();
    });
  }
  return { run, pending, feedback };
}

export function CreateTeamForm({ seats, planName }: { seats: number; planName: string }) {
  const [name, setName] = useState("");
  const { run, pending, feedback } = useAction();
  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
      <h3 className="text-lg font-bold text-foreground">Create your team</h3>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">
        Your {planName} plan includes a team workspace with {seats} seat{seats === 1 ? "" : "s"} (you plus {Math.max(0, seats - 1)} more).
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => createTeam(name));
        }}
        className="flex flex-wrap gap-3"
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name, e.g. Acme Marketing" maxLength={60} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        <button disabled={pending || !name.trim()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Create team
        </button>
      </form>
      {feedback.error && <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">{feedback.error}</p>}
    </section>
  );
}
