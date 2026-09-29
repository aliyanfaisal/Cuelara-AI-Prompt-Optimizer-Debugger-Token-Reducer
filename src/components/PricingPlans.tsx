"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { formatPlanPrice, planFeatures, yearlySavingsPercent } from "@/lib/pricing";
import PaddleCheckoutButton from "@/components/PaddleCheckoutButton";
import type { PaddleEnvironment } from "@/lib/paddle";

type Plan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  features: string | null;
  isFeatured: boolean;
  allowsOwnKeys: boolean;
  paddleMonthlyPriceIdSandbox: string | null;
  paddleMonthlyPriceIdProduction: string | null;
  paddleYearlyPriceIdSandbox: string | null;
  paddleYearlyPriceIdProduction: string | null;
};

export default function PricingPlans({
  plans,
  paddleSettings,
  user,
}: {
  plans: Plan[];
  paddleSettings: { clientToken: string; environment: PaddleEnvironment };
  user: { id: string; email: string | null } | null;
}) {
  const anyYearly = plans.some((p) => p.priceYearlyCents > 0);
  const [interval, setInterval] = useState<"month" | "year">("month");

  return (
    <div>
      {anyYearly && (
        <div className="mb-10 flex items-center justify-center gap-3">
          <div className="inline-flex p-1 rounded-full border border-border bg-card">
            {(["month", "year"] as const).map((i) => (
              <button
                key={i}
                onClick={() => setInterval(i)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-colors ${
                  interval === i ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {i === "month" ? "Monthly" : "Yearly"}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
        {plans.map((plan) => {
          const usingYearly = interval === "year" && plan.priceYearlyCents > 0;
          const cents = usingYearly ? plan.priceYearlyCents : plan.priceMonthlyCents;
          const price = formatPlanPrice(cents, usingYearly ? "year" : "month");
          const isFree = plan.priceMonthlyCents === 0;
          const savings = yearlySavingsPercent(plan.priceMonthlyCents, plan.priceYearlyCents);

          const priceId = usingYearly
            ? paddleSettings.environment === "production"
              ? plan.paddleYearlyPriceIdProduction
              : plan.paddleYearlyPriceIdSandbox
            : paddleSettings.environment === "production"
              ? plan.paddleMonthlyPriceIdProduction
              : plan.paddleMonthlyPriceIdSandbox;

          const ctaClass = `mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl px-6 text-sm font-bold transition-colors ${
            plan.isFeatured ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border bg-background text-foreground hover:bg-muted"
          }`;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-3xl border bg-card p-8 shadow-sm ${
                plan.isFeatured ? "border-primary shadow-xl shadow-primary/10 lg:-translate-y-2" : "border-border/60"
              }`}
            >
              {plan.isFeatured && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  <Sparkles className="h-3 w-3" /> Most popular
                </span>
              )}

              <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
              {plan.description && <p className="mt-1 min-h-10 text-sm text-muted-foreground">{plan.description}</p>}

              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-black tracking-tight text-foreground">{price.amount}</span>
                {price.period && <span className="text-sm font-medium text-muted-foreground">{price.period}</span>}
              </p>
              {usingYearly && savings > 0 && <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-500">Save {savings}% vs. monthly</p>}

              {priceId && !isFree ? (
                !user ? (
                  <Link href={`/register?callbackUrl=${encodeURIComponent("/pricing")}`} className={ctaClass}>
                    Sign up to subscribe
                  </Link>
                ) : (
                  <PaddleCheckoutButton
                    priceId={priceId}
                    clientToken={paddleSettings.clientToken}
                    environment={paddleSettings.environment}
                    userId={user.id}
                    userEmail={user.email ?? ""}
                    className={ctaClass}
                  >
                    Subscribe
                  </PaddleCheckoutButton>
                )
              ) : (
                <Link href={plan.allowsOwnKeys ? "/dashboard/models" : isFree ? "/register" : `/contact?plan=${plan.slug}`} className={ctaClass}>
                  {plan.allowsOwnKeys ? "Add your own keys" : isFree ? "Get started free" : "Contact us"}
                </Link>
              )}

              <ul className="mt-8 space-y-3 border-t border-border pt-8 text-sm text-foreground/90">
                {planFeatures(plan.features).map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
