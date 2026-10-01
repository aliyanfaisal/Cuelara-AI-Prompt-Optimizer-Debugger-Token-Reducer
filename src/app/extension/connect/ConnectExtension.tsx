"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, Plug } from "lucide-react";
import { pingExtension, sendConnectToken } from "@/lib/extension/extension-bridge";
import { connectExtensionAction } from "./actions";

type Phase = "checking" | "missing" | "ready" | "done" | "rejected";

export function ConnectExtension({ state, account }: { state: string; account: string }) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    pingExtension().then((version) => {
      if (!cancelled) setPhase(version ? "ready" : "missing");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const approve = () => {
    setError(null);
    startTransition(async () => {
      const result = await connectExtensionAction(navigator.userAgent.includes("Edg/") ? "Edge" : "Chrome");
      if ("error" in result) return setError(result.error);
      // The token goes straight to the extension and is never put in a URL or stored by this page.
      const accepted = await sendConnectToken(state, result.token);
      setPhase(accepted ? "done" : "rejected");
    });
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-lg items-center px-4 pb-24 pt-32">
      <div className="w-full rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {phase === "done" ? <Check className="h-6 w-6" /> : <Plug className="h-6 w-6" />}
        </span>

        {phase === "checking" && (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Looking for the extension&hellip;
          </p>
        )}

        {phase === "missing" && (
          <>
            <h1 className="mb-2 text-2xl font-black tracking-tight text-foreground">Extension not found</h1>
            <p className="mb-6 text-sm text-muted-foreground">Install the Cuelara extension, then start the connection again from its popup.</p>
            <Link href="/tools/site-to-prompt" className="text-sm font-semibold text-primary hover:underline">How to install</Link>
          </>
        )}

        {phase === "ready" && (
          <>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Cuelara extension</p>
            <h1 className="mb-2 text-2xl font-black tracking-tight text-foreground">Connect to your account</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Let the extension in this browser use <strong className="text-foreground">{account}</strong>: your plan&rsquo;s daily limits and your saved site settings. You can disconnect it any time from the extension or your dashboard.
            </p>
            <ul className="mb-6 space-y-1.5 text-left text-xs text-muted-foreground">
              <li>&bull; The extension never sees your password. It gets a separate access token that only works for Cuelara&rsquo;s tools.</li>
              <li>&bull; It can run the tools and read or change your site settings. It can&rsquo;t change your account, plan or billing.</li>
              <li>&bull; Your text is sent to Cuelara only when you pick a tool in the extension.</li>
            </ul>
            {error && <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
            <button
              type="button"
              onClick={approve}
              disabled={pending}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Connect this browser
            </button>
          </>
        )}

        {phase === "done" && (
          <>
            <h1 className="mb-2 text-2xl font-black tracking-tight text-foreground">You&rsquo;re connected</h1>
            <p className="text-sm text-muted-foreground">Open the Cuelara extension to see your usage. You can close this tab.</p>
          </>
        )}

        {phase === "rejected" && (
          <>
            <h1 className="mb-2 text-2xl font-black tracking-tight text-foreground">The extension didn&rsquo;t accept it</h1>
            <p className="text-sm text-muted-foreground">This link has expired or was already used. Start again from the extension popup.</p>
          </>
        )}
      </div>
    </div>
  );
}
