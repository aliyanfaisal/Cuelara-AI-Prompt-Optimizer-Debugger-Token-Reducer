import Link from "next/link";
import { Clock, Wallet } from "lucide-react";

export const metadata = { title: "Payment Methods" };

export default function PaymentMethodsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Payment methods</h2>
        <p className="text-sm text-muted-foreground">Cards and billing details for your subscription.</p>
      </div>

      <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-16 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <Wallet className="h-8 w-8" />
        </div>
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-amber-500" /> Coming soon
        </span>
        <h3 className="mb-2 text-2xl font-black tracking-tight text-foreground">Payments are on the way</h3>
        <p className="mb-8 max-w-md text-muted-foreground">
          You&apos;ll be able to add a card, see invoices and manage billing here. Until then, paid plans are arranged with our team.
        </p>
        <Link href="/dashboard/subscription" className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90">
          View subscription
        </Link>
      </div>
    </div>
  );
}
