"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cancelMySubscription } from "./actions";

export function CancelSubscriptionButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    if (!confirm("Cancel your subscription? You'll move to the free plan immediately and stop being billed.")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelMySubscription();
      if ("error" in result) return setError(result.error);
      router.refresh();
    });
  }

  return (
    <div>
      <button onClick={run} disabled={pending} className={className}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Cancel subscription
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
