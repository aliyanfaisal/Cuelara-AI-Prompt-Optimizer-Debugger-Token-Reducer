"use client";

import { useEffect } from "react";
import { reportClientError } from "@/components/ErrorReporter";

// Without this, any render error on the connect page falls through to the site-wide "Something went wrong" screen,
// which hides that the connection may already have succeeded. This keeps the site layout and says what to do.
export default function ConnectExtensionError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error);
    console.error("Cuelara extension connect error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-lg items-center px-4 pb-24 pt-32">
      <div className="w-full rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="mb-2 text-2xl font-black tracking-tight text-foreground">Couldn&rsquo;t finish on this page</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          If the Cuelara extension already shows your account, you&rsquo;re connected and can close this tab. Otherwise open the extension and press <strong className="text-foreground">Connect</strong> again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-6 text-sm font-bold text-foreground hover:bg-muted"
        >
          Try again
        </button>
        {error.digest && <p className="mt-4 text-[11px] text-muted-foreground">Reference: {error.digest}</p>}
      </div>
    </div>
  );
}
