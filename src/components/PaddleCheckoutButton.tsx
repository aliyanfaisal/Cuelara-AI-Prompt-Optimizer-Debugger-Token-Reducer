"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { usePaddleInstance } from "@/hooks/usePaddleInstance";
import { reportPaddleEvent } from "@/lib/report-paddle-error";
import type { PaddleEnvironment } from "@/lib/paddle";

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
  const [error, setError] = useState<string | null>(null);
  const paddle = usePaddleInstance(clientToken, environment, (event) => {
    reportPaddleEvent(event, `checkout priceId=${priceId}`);
    if (event.name === "checkout.error" || event.name === "checkout.failed") {
      setError("Checkout couldn't open. We've logged it — try again shortly or contact support.");
      setIsOpening(false);
    }
  });

  function openCheckout() {
    if (!paddle) return;
    setError(null);
    setIsOpening(true);
    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email: userEmail },
      // Read back in the webhook handler to attribute the subscription to this user.
      customData: { userId },
      settings: { successUrl: `${window.location.origin}/dashboard?checkout=success` },
    });
    // Paddle's overlay has its own loading state; drop ours once it's had a moment to take over.
    setTimeout(() => setIsOpening(false), 1500);
  }

  return (
    <div>
      <button onClick={openCheckout} disabled={!paddle || isOpening} className={className}>
        {!paddle || isOpening ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
