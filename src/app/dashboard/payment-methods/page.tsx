import Link from "next/link";
import { ExternalLink, Clock, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { getSubscriptionManagementUrls } from "@/lib/paddle";

export const metadata = { title: "Payment Methods" };

export default async function PaymentMethodsPage() {
  const session = (await getSessionUser())!;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id }, select: { paddleSubscriptionId: true } });
  const links = user.paddleSubscriptionId ? await getSubscriptionManagementUrls(user.paddleSubscriptionId) : null;

  if (!links) {
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
            <Clock className="h-3.5 w-3.5 text-amber-500" /> No active subscription
          </span>
          <h3 className="mb-2 text-2xl font-black tracking-tight text-foreground">Nothing to manage yet</h3>
          <p className="mb-8 max-w-md text-muted-foreground">
            Once you subscribe to a paid plan, you can update your card and manage billing here.
          </p>
          <Link href="/dashboard/subscription" className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90">
            View subscription
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Payment methods</h2>
        <p className="text-sm text-muted-foreground">Cards and billing details for your subscription, managed securely by Paddle.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 sm:flex-row">
        {links.updatePaymentMethod && (
          <a
            href={links.updatePaymentMethod}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            Update payment method <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        <a
          href={links.cancel}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border px-5 text-sm font-bold text-foreground hover:bg-muted"
        >
          Cancel subscription <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
