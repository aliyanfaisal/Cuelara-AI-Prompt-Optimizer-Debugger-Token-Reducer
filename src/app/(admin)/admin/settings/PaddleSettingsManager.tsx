"use client";

import { useState } from "react";
import { Loader2, CreditCard, ShieldCheck, ExternalLink } from "lucide-react";
import { updatePaddleSettings, type PaddleSettingsView } from "./paddle-actions";
import type { PaddleEnvironment } from "@/lib/paddle";

export default function PaddleSettingsManager({ initial }: { initial: PaddleSettingsView }) {
  const [environment, setEnvironment] = useState<PaddleEnvironment>(initial.environment);
  const [clientToken, setClientToken] = useState(initial.clientToken);
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [hasApiKey, setHasApiKey] = useState(initial.hasApiKey);
  const [hasWebhookSecret, setHasWebhookSecret] = useState(initial.hasWebhookSecret);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);
    const result = await updatePaddleSettings({ environment, clientToken, apiKey, webhookSecret });
    setIsSaving(false);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    if (apiKey.trim()) setHasApiKey(true);
    if (webhookSecret.trim()) setHasWebhookSecret(true);
    setApiKey("");
    setWebhookSecret("");
    setMessage({ type: "success", text: "Paddle settings saved." });
  }

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/paddle` : "/api/webhooks/paddle";

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Paddle</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Controls checkout on /pricing and subscription sync. Get these from your{" "}
        <a href="https://vendors.paddle.com/authentication" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
          Paddle dashboard <ExternalLink className="w-3 h-3" />
        </a>{" "}
        (switch to Sandbox there for test keys).
      </p>

      <div className="space-y-5 rounded-xl border border-border bg-card p-6">
        <div>
          <label className="block text-sm font-semibold mb-2">Environment</label>
          <div className="inline-flex p-1 rounded-lg bg-muted border border-border">
            {(["sandbox", "production"] as const).map((env) => (
              <button
                key={env}
                onClick={() => setEnvironment(env)}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
                  environment === env ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {env}
              </button>
            ))}
          </div>
          {environment === "production" && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">Live mode — checkouts will charge real cards.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5">Client-side token</label>
          <p className="text-xs text-muted-foreground mb-2">Public token used by Paddle.js on the pricing page to open checkout. Safe to expose in the browser.</p>
          <input
            type="text"
            value={clientToken}
            onChange={(e) => setClientToken(e.target.value)}
            placeholder="test_... or live_..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5">API key {hasApiKey && <span className="ml-1 text-xs font-normal text-emerald-600 dark:text-emerald-500">(set)</span>}</label>
          <p className="text-xs text-muted-foreground mb-2">Server-side secret key, used to talk to the Paddle API. Leave blank to keep the one already saved.</p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasApiKey ? "••••••••••••••••" : "pdl_..."}
            autoComplete="off"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Webhook secret {hasWebhookSecret && <span className="ml-1 text-xs font-normal text-emerald-600 dark:text-emerald-500">(set)</span>}
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            From the notification destination you create in Paddle pointing at{" "}
            <code className="px-1 py-0.5 rounded bg-muted text-[11px]">{webhookUrl}</code>. Leave blank to keep the one already saved.
          </p>
          <input
            type="password"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder={hasWebhookSecret ? "••••••••••••••••" : "pdl_ntfset_..."}
            autoComplete="off"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono"
          />
        </div>

        {message && (
          <p className={`text-sm ${message.type === "error" ? "text-destructive" : "text-emerald-600 dark:text-emerald-500"}`}>{message.text}</p>
        )}

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save
        </button>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Each paid plan also needs a Paddle Price ID — set it on the plan in <a href="/admin/plans" className="text-primary hover:underline">Plans</a> after creating the matching product/price in Paddle.
      </p>
    </div>
  );
}
