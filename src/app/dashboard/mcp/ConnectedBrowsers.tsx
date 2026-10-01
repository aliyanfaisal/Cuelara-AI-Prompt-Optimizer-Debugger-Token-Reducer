"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Trash2 } from "lucide-react";
import { revokeMcpTokenAction } from "./actions";
import type { PersonalAccessTokenRow } from "@/lib/personal-access-tokens";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function ConnectedBrowsers({ initial }: { initial: PersonalAccessTokenRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleRevoke = (id: string) => {
    setError(null);
    startTransition(async () => {
      const result = await revokeMcpTokenAction(id);
      if ("error" in result) return setError(result.error);
      router.refresh();
    });
  };

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-bold text-foreground">Connected browsers</h3>
        <p className="text-sm text-muted-foreground">Browsers where the Cuelara extension is signed in to your account. Disconnect one and it falls back to the anonymous limits.</p>
      </div>
      {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      {initial.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center">
          <Globe className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No browsers connected. Open the Cuelara extension and choose Connect.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {initial.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{t.label}</p>
                <p className="text-xs text-muted-foreground">
                  Connected {formatDate(t.createdAt)}
                  {t.lastUsedAt ? ` · Last used ${formatDate(t.lastUsedAt)}` : " · Never used"}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(t.id)}
                disabled={pending}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" /> Disconnect
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
