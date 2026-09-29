"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { usePaddleInstance } from "@/hooks/usePaddleInstance";
import { reportPaddleEvent } from "@/lib/report-paddle-error";
import { requestCardUpdateTransaction } from "@/app/dashboard/payment-methods/actions";
import type { PaddleEnvironment } from "@/lib/paddle";

export default function PaddleManageCardButton({
  clientToken,
  environment,
  className,
  children,
}: {
  clientToken: string;
  environment: PaddleEnvironment;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paddle = usePaddleInstance(clientToken, environment, (event) => {
    reportPaddleEvent(event, "card update");
    if (event.name === "checkout.completed") {
      // The webhook that actually updates the saved card details lands a moment after this
      // client-side event, so give it a beat before pulling the fresh card onto the page.
      setTimeout(() => router.refresh(), 1500);
    }
    if (event.name === "checkout.error" || event.name === "checkout.failed") {
      setError("Couldn't open the card form. We've logged it — try again shortly.");
      setIsOpening(false);
    }
  });

  async function openCardUpdate() {
    setError(null);
    setIsOpening(true);
    const result = await requestCardUpdateTransaction();
    if ("error" in result) {
      setIsOpening(false);
      setError(result.error);
      return;
    }
    paddle?.Checkout.open({ transactionId: result.transactionId });
    setTimeout(() => setIsOpening(false), 1500);
  }

  return (
    <div>
      <button onClick={openCardUpdate} disabled={!paddle || isOpening} className={className}>
        {!paddle || isOpening ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
