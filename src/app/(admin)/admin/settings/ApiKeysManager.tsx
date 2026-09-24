"use client";

import { useState } from "react";
import { Plus, Trash2, KeyRound, ShieldAlert, Loader2, Sparkles } from "lucide-react";
import { PROVIDERS, PROVIDER_LABELS, type Provider } from "@/lib/providers";
import { addApiKey, deleteApiKey, setApiKeyActive, updateOpenRouterModelMode, type ApiKeyRow } from "./api-key-actions";
import type { OpenRouterModelMode } from "@/lib/openrouter-mode";

function maskKey(key: string): string {
  if (key.length <= 4) return "••••";
  return `••••••••${key.slice(-4)}`;
}

const PROVIDER_HINTS: Record<Provider, string> = {
  gemini: "Primary model for Prompt Optimizer, Token Optimizer, and Context Extractor.",
  groq: "Free-tier overflow for Prompt Optimizer and Token Optimizer — used only when Gemini's pool is exhausted.",
  openrouter: "Free-tier overflow, tried after Gemini and Groq are exhausted.",
  grok: "Not wired into any tool yet — stored for future use.",
  openai: "Not wired into any tool yet — stored for future use.",
  claude: "Not wired into any tool yet — stored for future use.",
};

function OpenRouterModeToggle({ mode, onChange }: { mode: OpenRouterModelMode; onChange: (mode: OpenRouterModelMode) => void }) {
  const [isSaving, setIsSaving] = useState(false);

  async function handlePick(next: OpenRouterModelMode) {
    if (next === mode || isSaving) return;
    setIsSaving(true);
    const result = await updateOpenRouterModelMode(next);
    setIsSaving(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    onChange(next);
  }

  return (
    <div className="mx-6 mb-6 p-4 rounded-lg border border-border bg-muted/30">
      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
        <Sparkles className="w-3.5 h-3.5 text-primary" /> Model source
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        Free mode fetches OpenRouter&rsquo;s currently-free model list (refreshed hourly) and tries a few of the
        richest-context ones in turn, instead of one hardcoded model that can be retired or paywalled at any time.
      </p>
      <div className="inline-flex p-1 rounded-lg bg-background border border-border">
        {(["free", "paid"] as const).map((m) => (
          <button
            key={m}
            onClick={() => handlePick(m)}
            disabled={isSaving || m === "paid"}
            title={m === "paid" ? "Not available yet — no paid model has been configured." : undefined}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              mode === m ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProviderCard({
  provider,
  keys,
  onChange,
  extra,
}: {
  provider: Provider;
  keys: ApiKeyRow[];
  onChange: (provider: Provider, keys: ApiKeyRow[]) => void;
  extra?: React.ReactNode;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const activeCount = keys.filter((k) => k.isActive).length;

  async function handleAdd() {
    if (!newKey.trim()) return;
    setIsSaving(true);
    const result = await addApiKey(provider, newKey, newLabel);
    setIsSaving(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    // Optimistic row — real id/createdAt come back on next full load, but this
    // keeps the UI responsive without a round-trip refetch.
    onChange(provider, [
      ...keys,
      { id: `temp-${Date.now()}`, provider, key: newKey.trim(), label: newLabel.trim() || null, isActive: true, createdAt: new Date().toISOString() },
    ]);
    setNewKey("");
    setNewLabel("");
    setIsAdding(false);
  }

  async function handleDelete(id: string) {
    if (id.startsWith("temp-")) {
      onChange(provider, keys.filter((k) => k.id !== id));
      return;
    }
    setPendingId(id);
    const result = await deleteApiKey(id);
    setPendingId(null);
    if (result.error) {
      alert(result.error);
      return;
    }
    onChange(provider, keys.filter((k) => k.id !== id));
  }

  async function handleToggle(id: string, isActive: boolean) {
    setPendingId(id);
    const result = await setApiKeyActive(id, isActive);
    setPendingId(null);
    if (result.error) {
      alert(result.error);
      return;
    }
    onChange(provider, keys.map((k) => (k.id === id ? { ...k, isActive } : k)));
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            {PROVIDER_LABELS[provider]}
          </h3>
          <p className="text-muted-foreground mt-1 text-xs">{PROVIDER_HINTS[provider]}</p>
        </div>
        <span className="shrink-0 px-2.5 py-1 rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {activeCount} active
        </span>
      </div>

      {extra}

      <div className="p-6 space-y-3">
        {keys.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground italic">No keys added yet.</p>
        )}

        {keys.map((k) => (
          <div key={k.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-background">
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={k.isActive}
                disabled={pendingId === k.id}
                onChange={(e) => handleToggle(k.id, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
            </label>

            <span className="font-mono text-sm text-foreground">{maskKey(k.key)}</span>
            {k.label && <span className="text-xs text-muted-foreground truncate">{k.label}</span>}

            <button
              onClick={() => handleDelete(k.id)}
              disabled={pendingId === k.id}
              className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              title="Remove key"
            >
              {pendingId === k.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        ))}

        {isAdding ? (
          <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Paste API key"
              autoFocus
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (optional, e.g. personal account)"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleAdd}
                disabled={isSaving || !newKey.trim()}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Key"}
              </button>
              <button
                onClick={() => { setIsAdding(false); setNewKey(""); setNewLabel(""); }}
                className="px-4 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-border text-sm font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add {PROVIDER_LABELS[provider]} Key
          </button>
        )}
      </div>
    </div>
  );
}

export default function ApiKeysManager({
  initialKeys,
  initialOpenRouterMode,
}: {
  initialKeys: Record<Provider, ApiKeyRow[]>;
  initialOpenRouterMode: OpenRouterModelMode;
}) {
  const [keysByProvider, setKeysByProvider] = useState(initialKeys);
  const [openRouterMode, setOpenRouterMode] = useState(initialOpenRouterMode);

  function handleChange(provider: Provider, keys: ApiKeyRow[]) {
    setKeysByProvider((prev) => ({ ...prev, [provider]: keys }));
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3 text-amber-600 dark:text-amber-400">
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold">How key rotation works</p>
          <p>Each tool call picks one random active key from the matching provider&rsquo;s pool. If that key hits a rate limit or fails, the request automatically retries with a different key from the pool before giving up — spreading usage across free-tier limits instead of exhausting a single key.</p>
        </div>
      </div>

      {PROVIDERS.map((provider) => (
        <ProviderCard
          key={provider}
          provider={provider}
          keys={keysByProvider[provider]}
          onChange={handleChange}
          extra={provider === "openrouter" ? <OpenRouterModeToggle mode={openRouterMode} onChange={setOpenRouterMode} /> : undefined}
        />
      ))}
    </div>
  );
}
