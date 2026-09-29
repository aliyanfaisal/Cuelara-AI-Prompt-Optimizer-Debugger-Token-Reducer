import Link from "next/link";
import { CreditCard, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { getPaddleSettings } from "@/lib/paddle";
import PaddleManageCardButton from "@/components/PaddleManageCardButton";
import { CancelSubscriptionButton } from "./CancelSubscriptionButton";

export const metadata = { title: "Payment Methods" };

const CARD_BRAND_LABELS: Record<string, string> = {
  american_express: "Amex",
  diners_club: "Diners Club",
  discover: "Discover",
  jcb: "JCB",
  mada: "Mada",
  maestro: "Maestro",
  mastercard: "Mastercard",
  union_pay: "UnionPay",
  visa: "Visa",
  unknown: "Card",
};

function formatMoney(cents: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currencyCode}`;
  }
}

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  paid: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  billed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  past_due: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  canceled: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  draft: "bg-muted text-muted-foreground",
  ready: "bg-muted text-muted-foreground",
};

export default async function PaymentMethodsPage() {
  const session = (await getSessionUser())!;
  const [user, transactions, paddleSettings] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.id },
      select: { paddleSubscriptionId: true, cardBrand: true, cardLast4: true, cardExpiryMonth: true, cardExpiryYear: true },
    }),
    prisma.paymentTransaction.findMany({ where: { userId: session.id }, orderBy: { createdAt: "desc" }, take: 25 }),
    getPaddleSettings(),
  ]);

  if (!user.paddleSubscriptionId) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground">Payment methods</h2>
          <p className="text-sm text-muted-foreground">Your card and billing history.</p>
        </div>

        <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Wallet className="h-8 w-8" />
          </div>
          <h3 className="mb-2 text-2xl font-black tracking-tight text-foreground">No active subscription</h3>
          <p className="mb-8 max-w-md text-muted-foreground">Once you subscribe to a paid plan, your card and billing history show up here.</p>
          <Link href="/dashboard/subscription" className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90">
            View subscription
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground">Payment methods</h2>
        <p className="text-sm text-muted-foreground">Your card and billing history.</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-bold text-foreground">Card on file</h3>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
              <CreditCard className="h-5 w-5" />
            </div>
            {user.cardLast4 ? (
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {CARD_BRAND_LABELS[user.cardBrand ?? "unknown"] ?? "Card"} •••• {user.cardLast4}
                </p>
                {user.cardExpiryMonth && user.cardExpiryYear && (
                  <p className="text-xs text-muted-foreground">
                    Expires {String(user.cardExpiryMonth).padStart(2, "0")}/{user.cardExpiryYear}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No card details on file yet.</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <PaddleManageCardButton
              clientToken={paddleSettings.clientToken}
              environment={paddleSettings.environment}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {user.cardLast4 ? "Update card" : "Add card"}
            </PaddleManageCardButton>
            <CancelSubscriptionButton className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-bold text-foreground hover:bg-muted disabled:opacity-60" />
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-sm font-bold text-foreground">Payment history</h3>
        {transactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No charges yet.</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3 text-foreground">{(t.billedAt ?? t.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3 font-semibold tabular-nums text-foreground">{formatMoney(t.amountCents, t.currencyCode)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold capitalize ${STATUS_STYLES[t.status] ?? "bg-muted text-muted-foreground"}`}>
                        {t.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
