"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { formatPlanPrice, planFeatures, yearlySavingsPercent } from "@/lib/pricing";
import PaddleCheckoutButton from "@/components/PaddleCheckoutButton";
import type { PaddleEnvironment } from "@/lib/paddle";
import { PlanActions } from "./PlanActions";

type Plan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  features: string | null;
  historyPerTool: number;
  allowsOwnKeys: boolean;
  paddleMonthlyPriceIdSandbox: string | null;
  paddleMonthlyPriceIdProduction: string | null;
  paddleYearlyPriceIdSandbox: string | null;
  paddleYearlyPriceIdProduction: string | null;
};

export default function SubscriptionOtherPlans({
  plans,
  currentPrice,
  requestedSlugs,
  hasActivePaddleSubscription,
  paddleSettings,
  user,
}: {
  plans: Plan[];
  currentPrice: number;
  requestedSlugs: string[];
  hasActivePaddleSubscription: boolean;
  paddleSettings: { clientToken: string; environment: PaddleEnvironment };
  user: { id: string; email: string | null };
}) {
  const anyYearly = plans.some((p) => p.priceYearlyCents > 0);
  const [interval, setInterval] = useState<"month" | "year">("month");

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-foreground">Other plans</h3>
        {anyYearly && (
          <div className="inline-flex p-1 rounded-full border border-border bg-card">
            {(["month", "year"] as const).map((i) => (
              <button
                key={i}
                onClick={() => setInterval(i)}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${
                  interval === i ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {i === "month" ? "Monthly" : "Yearly"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {plans.map((plan) => {
          const kind = plan.priceMonthlyCents > currentPrice ? "upgrade" : "downgrade";
          const usingYearly = interval === "year" && plan.priceYearlyCents > 0;
          const cents = usingYearly ? plan.priceYearlyCents : plan.priceMonthlyCents;
          const p = formatPlanPrice(cents, usingYearly ? "year" : "month");
          const savings = yearlySavingsPercent(plan.priceMonthlyCents, plan.priceYearlyCents);

          const priceId = usingYearly
            ? paddleSettings.environment === "production"
              ? plan.paddleYearlyPriceIdProduction
              : plan.paddleYearlyPriceIdSandbox
            : paddleSettings.environment === "production"
              ? plan.paddleMonthlyPriceIdProduction
              : plan.paddleMonthlyPriceIdSandbox;

          return (
            <div key={plan.id} className="flex flex-col rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-bold text-foreground">{plan.name}</h4>
                  {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p>
                    <span className="text-2xl font-black text-foreground">{p.amount}</span>
                    {p.period && <span className="text-xs text-muted-foreground">{p.period}</span>}
                  </p>
                  {usingYearly && savings > 0 && <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-500">Save {savings}%</p>}
                </div>
              </div>
              <ul className="mb-6 flex-1 space-y-2 text-sm text-foreground/90">
                {planFeatures(plan.features).map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> <span>{f}</span>
                  </li>
                ))}
              </ul>
              {plan.allowsOwnKeys ? (
                <Link href="/dashboard/models" className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
                  Set up your model keys
                </Link>
              ) : kind === "upgrade" && priceId && !hasActivePaddleSubscription ? (
                <PaddleCheckoutButton
                  priceId={priceId}
                  clientToken={paddleSettings.clientToken}
                  environment={paddleSettings.environment}
                  userId={user.id}
                  userEmail={user.email ?? ""}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
                >
                  Subscribe to {plan.name}
                </PaddleCheckoutButton>
              ) : kind === "upgrade" && priceId && hasActivePaddleSubscription ? (
                <p className="text-xs text-muted-foreground">To switch plans, cancel your current subscription below first, then subscribe to this one.</p>
              ) : (
                <PlanActions planId={plan.id} planName={plan.name} kind={kind} requested={requestedSlugs.includes(plan.slug)} historyPerTool={plan.historyPerTool} />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Upgrades open checkout when self-serve billing is set up for that plan, or send our team a request otherwise. Downgrades take effect straight away. Questions?{" "}
        <Link href="/contact" className="font-semibold text-primary hover:underline">Contact us</Link>.
      </p>
    </section>
  );
}
