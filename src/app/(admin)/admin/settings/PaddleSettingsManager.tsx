"use client";

import { useState } from "react";
import { Loader2, CreditCard, ShieldCheck, ExternalLink } from "lucide-react";
import { setActivePaddleEnvironment, updatePaddleEnvironmentCredentials, type PaddleEnvironmentView, type PaddleSettingsView } from "./paddle-actions";
import type { PaddleEnvironment } from "@/lib/paddle";

function EnvironmentCard({
  env,
  initial,
  isActive,
}: {
  env: PaddleEnvironment;
  initial: PaddleEnvironmentView;
  isActive: boolean;
}) {
  const [clientToken, setClientToken] = useState(initial.clientToken);
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [hasApiKey, setHasApiKey] = useState(initial.hasApiKey);
  const [hasWebhookSecret, setHasWebhookSecret] = useState(initial.hasWebhookSecret);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/paddle` : "/api/webhooks/paddle";

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);
    const result = await updatePaddleEnvironmentCredentials(env, { clientToken, apiKey, webhookSecret });
    setIsSaving(false);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    if (apiKey.trim()) setHasApiKey(true);
    if (webhookSecret.trim()) setHasWebhookSecret(true);
    setApiKey("");
    setWebhookSecret("");
    setMessage({ type: "success", text: "Saved." });
  }

  return (
    <div className={`space-y-5 rounded-xl border p-6 ${isActive ? "border-primary/60 bg-card" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold capitalize">{env}</h3>
        {isActive && <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">Live now</span>}
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5">Client-side token</label>
        <p className="text-xs text-muted-foreground mb-2">Public token used by Paddle.js to open checkout. Safe to expose in the browser.</p>
        <input
          type="text"
          value={clientToken}
          onChange={(e) => setClientToken(e.target.value)}
          placeholder={env === "sandbox" ? "test_..." : "live_..."}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5">API key {hasApiKey && <span className="ml-1 text-xs font-normal text-emerald-600 dark:text-emerald-500">(set)</span>}</label>
        <p className="text-xs text-muted-foreground mb-2">Server-side secret key. Leave blank to keep the one already saved.</p>
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
          From a notification destination pointing at <code className="px-1 py-0.5 rounded bg-muted text-[11px]">{webhookUrl}</code> in this account. Each environment needs its own destination.
          Leave blank to keep the one already saved.
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

      {message && <p className={`text-sm ${message.type === "error" ? "text-destructive" : "text-emerald-600 dark:text-emerald-500"}`}>{message.text}</p>}

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
      >
        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
        Save {env}
      </button>
    </div>
  );
}

export default function PaddleSettingsManager({ initial }: { initial: PaddleSettingsView }) {
  const [environment, setEnvironment] = useState<PaddleEnvironment>(initial.environment);
  const [isSwitching, setIsSwitching] = useState(false);

  async function handleSwitch(next: PaddleEnvironment) {
    if (next === environment || isSwitching) return;
    setIsSwitching(true);
    const result = await setActivePaddleEnvironment(next);
    setIsSwitching(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    setEnvironment(next);
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Paddle</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Controls checkout on /pricing and subscription sync. Sandbox and production are separate Paddle accounts with
        separate keys — both are stored below, and the switch decides which one is actually used. Get keys from your{" "}
        <a href="https://vendors.paddle.com/authentication" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
          Paddle dashboard <ExternalLink className="w-3 h-3" />
        </a>{" "}
        (there&rsquo;s a Sandbox/Live switch inside Paddle itself for each set of keys).
      </p>

      <div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <span className="text-sm font-semibold">Live environment:</span>
        <div className="inline-flex p-1 rounded-lg bg-muted border border-border">
          {(["sandbox", "production"] as const).map((env) => (
            <button
              key={env}
              onClick={() => handleSwitch(env)}
              disabled={isSwitching}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors disabled:opacity-60 ${
                environment === env ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {env}
            </button>
          ))}
        </div>
        {environment === "production" && <span className="text-xs text-amber-600 dark:text-amber-500">Live mode — checkouts charge real cards.</span>}
      </div>

      <div className="grid grid-cols-1 gap-5">
        <EnvironmentCard env="sandbox" initial={initial.sandbox} isActive={environment === "sandbox"} />
        <EnvironmentCard env="production" initial={initial.production} isActive={environment === "production"} />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Each paid plan also needs a Paddle Price ID for whichever environment is live — set it on the plan in{" "}
        <a href="/admin/plans" className="text-primary hover:underline">Plans</a> after creating the matching product/price in Paddle.
      </p>
    </div>
  );
}
