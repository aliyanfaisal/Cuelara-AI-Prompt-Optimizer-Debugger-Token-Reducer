import Link from "next/link";
import { Check } from "lucide-react";
import { getSubjectDailyUsage } from "@/lib/dashboard-usage";
import { getEffectivePlan } from "@/lib/plans";
import { formatPlanPrice, planFeatures } from "@/lib/pricing";
import { subjectForUser } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { PlanActions } from "./PlanActions";

export const metadata = { title: "Subscription" };

const weekAgo = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

export default async function SubscriptionPage() {
  const session = (await getSessionUser())!;

  const [user, current] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.id }, select: { email: true } }),
    getEffectivePlan(session.id),
  ]);

  const [plans, usage, requests] = await Promise.all([
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthlyCents: "asc" },
      select: { id: true, name: true, slug: true, description: true, priceMonthlyCents: true, features: true, historyPerTool: true },
    }),
    subjectForUser(session.id).then(getSubjectDailyUsage),
    // Upgrade requests from the last week, so a plan already asked for shows as requested.
    prisma.contactMessage.findMany({
      where: { email: user.email ?? "", subject: { startsWith: "Upgrade request:" }, createdAt: { gte: weekAgo() } },
      select: { plan: true },
    }),
  ]);

  const currentPrice = current?.priceMonthlyCents ?? 0;
  const requestedSlugs = new Set(requests.map((r) => r.plan));
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
          <p className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-foreground">{price.amount}</span>
            {price.period && <span className="text-sm text-muted-foreground">{price.period}</span>}
          </p>
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
        <section>
          <h3 className="mb-4 text-lg font-bold text-foreground">Other plans</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {others.map((plan) => {
              const kind = plan.priceMonthlyCents > currentPrice ? "upgrade" : "downgrade";
              const p = formatPlanPrice(plan.priceMonthlyCents);
              return (
                <div key={plan.id} className="flex flex-col rounded-2xl border border-border bg-card p-6">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-bold text-foreground">{plan.name}</h4>
                      {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
                    </div>
                    <p className="shrink-0 text-right">
                      <span className="text-2xl font-black text-foreground">{p.amount}</span>
                      {p.period && <span className="text-xs text-muted-foreground">{p.period}</span>}
                    </p>
                  </div>
                  <ul className="mb-6 flex-1 space-y-2 text-sm text-foreground/90">
                    {planFeatures(plan.features).map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <PlanActions planId={plan.id} planName={plan.name} kind={kind} requested={requestedSlugs.has(plan.slug)} historyPerTool={plan.historyPerTool} />
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Paid plans are set up by our team while payments are being built, so upgrades are requests. Downgrades take effect straight away. Questions?{" "}
            <Link href="/contact" className="font-semibold text-primary hover:underline">Contact us</Link>.
          </p>
        </section>
      )}
    </div>
  );
}
