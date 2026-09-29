import { getSubjectDailyUsage } from "@/lib/dashboard-usage";
import { getEffectivePlan } from "@/lib/plans";
import { formatPlanPrice } from "@/lib/pricing";
import { subjectForUser } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { getPaddleSettings } from "@/lib/paddle";
import SubscriptionOtherPlans from "./SubscriptionOtherPlans";

export const metadata = { title: "Subscription" };

const weekAgo = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

export default async function SubscriptionPage() {
  const session = (await getSessionUser())!;

  const [user, current] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.id }, select: { id: true, email: true, paddleSubscriptionId: true, subscriptionStatus: true, currentPeriodEnd: true } }),
    getEffectivePlan(session.id),
  ]);

  const [plans, usage, requests, paddleSettings] = await Promise.all([
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthlyCents: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        priceMonthlyCents: true,
        priceYearlyCents: true,
        features: true,
        historyPerTool: true,
        allowsOwnKeys: true,
        paddleMonthlyPriceIdSandbox: true,
        paddleMonthlyPriceIdProduction: true,
        paddleYearlyPriceIdSandbox: true,
        paddleYearlyPriceIdProduction: true,
      },
    }),
    subjectForUser(session.id).then(getSubjectDailyUsage),
    // Upgrade requests from the last week, so a plan already asked for shows as requested.
    prisma.contactMessage.findMany({
      where: { email: user.email ?? "", subject: { startsWith: "Upgrade request:" }, createdAt: { gte: weekAgo() } },
      select: { plan: true },
    }),
    getPaddleSettings(),
  ]);

  // Already on an active Paddle subscription: switching plans here would create a second one, so
  // self-serve checkout is only offered when they aren't currently subscribed through Paddle.
  const hasActivePaddleSubscription = !!user.paddleSubscriptionId;

  const currentPrice = current?.priceMonthlyCents ?? 0;
  const requestedSlugs = requests.map((r) => r.plan).filter((slug): slug is string => slug !== null);
  const others = plans.filter((p) => p.id !== current?.id);
  const price = formatPlanPrice(currentPrice);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground">Subscription</h2>
        <p className="text-sm text-muted-foreground">Your current plan and the other plans you can move to.</p>
      </div>

      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">Active plan</p>
            <h3 className="text-2xl font-black tracking-tight text-foreground">{current?.name ?? "No plan"}</h3>
            {current?.description && <p className="mt-1 text-sm text-muted-foreground">{current.description}</p>}
          </div>
          <div className="text-right">
            <p className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-foreground">{price.amount}</span>
              {price.period && <span className="text-sm text-muted-foreground">{price.period}</span>}
            </p>
            {hasActivePaddleSubscription && user.currentPeriodEnd && (
              <p className="mt-1 text-xs text-muted-foreground">
                {user.subscriptionStatus === "canceled" ? "Ends" : "Renews"} {user.currentPeriodEnd.toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <h4 className="mb-3 mt-6 text-sm font-bold text-foreground">Daily limits</h4>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex items-center justify-between border-b border-border/60 py-1.5">
            <dt className="text-muted-foreground">Saved history</dt>
            <dd className="font-semibold tabular-nums text-foreground">{current?.historyPerTool ?? 20} runs / tool</dd>
          </div>
          {usage.map((u) => (
            <div key={u.id} className="flex items-center justify-between border-b border-border/60 py-1.5">
              <dt className="text-muted-foreground">{u.label}</dt>
              <dd className="font-semibold tabular-nums text-foreground">{u.limit} / day</dd>
            </div>
          ))}
        </dl>
      </section>

      {others.length > 0 && (
        <SubscriptionOtherPlans
          plans={others}
          currentPrice={currentPrice}
          requestedSlugs={requestedSlugs}
          hasActivePaddleSubscription={hasActivePaddleSubscription}
          paddleSettings={paddleSettings}
          user={{ id: user.id, email: user.email }}
        />
      )}
    </div>
  );
}
