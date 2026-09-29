"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import { usePaddleInstance } from "@/hooks/usePaddleInstance";
import { reportPaddleEvent } from "@/lib/report-paddle-error";
import type { PaddleEnvironment } from "@/lib/paddle";

type ModalState = { kind: "success" } | { kind: "error"; message: string } | null;

export default function PaddleCheckoutButton({
  priceId,
  clientToken,
  environment,
  userId,
  userEmail,
  className,
  children,
}: {
  priceId: string;
  clientToken: string;
  environment: PaddleEnvironment;
  userId: string;
  userEmail: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [isOpening, setIsOpening] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);

  // No successUrl on the checkout — that used to force-navigate to /dashboard the instant Paddle's
  // overlay reported success, before our webhook had a chance to actually grant the plan. Staying on
  // this page and reacting to the event ourselves lets us say that plainly instead of implying it's done.
  const paddle = usePaddleInstance(clientToken, environment, (event) => {
    reportPaddleEvent(event, `checkout priceId=${priceId}`);
    if (event.name === "checkout.completed") {
      setModal({ kind: "success" });
    } else if (event.name === "checkout.error" || event.name === "checkout.failed") {
      setModal({ kind: "error", message: "Checkout couldn't open. We've logged it — try again shortly or contact support." });
      setIsOpening(false);
    }
  });

  function openCheckout() {
    if (!paddle) return;
    setIsOpening(true);
    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email: userEmail },
      // Read back in the webhook handler to attribute the subscription to this user.
      customData: { userId },
    });
    // Paddle's overlay has its own loading state; drop ours once it's had a moment to take over.
    setTimeout(() => setIsOpening(false), 1500);
  }

  return (
    <>
      <button onClick={openCheckout} disabled={!paddle || isOpening} className={className}>
        {!paddle || isOpening ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
      </button>

      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setModal(null)}>
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setModal(null)} className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground hover:bg-muted" aria-label="Close">
              <X className="h-4 w-4" />
            </button>

            {modal.kind === "success" ? (
              <>
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
                <h3 className="mb-2 text-lg font-bold text-foreground">Payment successful</h3>
                <p className="text-sm text-muted-foreground">
                  Your subscription is being set up — this usually takes just a couple of minutes, and can take up to 5. Your plan will update automatically once it&rsquo;s done; no need to refresh.
                </p>
                <button
                  onClick={() => setModal(null)}
                  className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
                >
                  Got it
                </button>
              </>
            ) : (
              <>
                <XCircle className="mx-auto mb-3 h-10 w-10 text-rose-500" />
                <h3 className="mb-2 text-lg font-bold text-foreground">Payment didn&rsquo;t go through</h3>
                <p className="text-sm text-muted-foreground">{modal.message}</p>
                <button
                  onClick={() => setModal(null)}
                  className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-xl border border-border px-5 text-sm font-bold text-foreground hover:bg-muted"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
