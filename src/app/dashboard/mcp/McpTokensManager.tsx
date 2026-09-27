"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Plus, Terminal, Trash2 } from "lucide-react";
import { createMcpTokenAction, revokeMcpTokenAction } from "./actions";
import type { PersonalAccessTokenRow } from "@/lib/personal-access-tokens";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function McpTokensManager({ initial }: { initial: PersonalAccessTokenRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = () => {
    setError(null);
    startTransition(async () => {
      const result = await createMcpTokenAction(label);
      if ("error" in result) return setError(result.error);
      setNewToken(result.token);
      setLabel("");
      router.refresh();
    });
  };

  const handleRevoke = (id: string) => {
    setError(null);
    startTransition(async () => {
      const result = await revokeMcpTokenAction(id);
      if ("error" in result) return setError(result.error);
      router.refresh();
    });
  };

  const handleCopy = () => {
    if (!newToken) return;
    navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {newToken && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <p className="mb-2 text-sm font-bold text-foreground">Copy your token now — it won&rsquo;t be shown again.</p>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
            <code className="flex-1 overflow-x-auto text-xs text-foreground">{newToken}</code>
            <button
              onClick={handleCopy}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-5">
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="token-label" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Label
          </label>
          <input
            id="token-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Claude Desktop"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={pending}
          className="flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Generate token
        </button>
      </div>

      {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}

      {initial.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-10 text-center">
          <Terminal className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No tokens yet. Generate one to authenticate the MCP server as yourself.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {initial.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{t.label}</p>
                <p className="text-xs text-muted-foreground">
                  Created {formatDate(t.createdAt)}
                  {t.lastUsedAt ? ` · Last used ${formatDate(t.lastUsedAt)}` : " · Never used"}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(t.id)}
                disabled={pending}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" /> Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
