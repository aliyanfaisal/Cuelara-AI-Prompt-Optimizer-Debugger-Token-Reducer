"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/admin-auth";
import { getPaddleClientFor, type PaddleEnvironment } from "@/lib/paddle";
import type { Paddle } from "@paddle/paddle-node-sdk";
import type { Plan } from "@/generated/client/client";

// Only mints a new Price if the amount actually changed since the last sync — Paddle prices are
// immutable, so re-syncing just to fix the product name shouldn't churn the price catalog. Returns
// null (no field to update) if this interval isn't priced (e.g. yearly on a monthly-only plan).
async function syncOnePrice(
  paddle: Paddle,
  productId: string,
  planName: string,
  amountCents: number,
  existingPriceId: string | null,
  interval: "month" | "year"
): Promise<string | null> {
  if (amountCents <= 0) return null;

  let currentAmount: string | null = null;
  if (existingPriceId) {
    currentAmount = await paddle.prices
      .get(existingPriceId)
      .then((p) => p.unitPrice.amount)
      .catch(() => null);
  }

  if (existingPriceId && currentAmount === String(amountCents)) return existingPriceId;

  const price = await paddle.prices.create({
    productId,
    description: `${planName} — ${interval === "month" ? "monthly" : "yearly"}`,
    unitPrice: { amount: String(amountCents), currencyCode: "USD" },
    billingCycle: { interval, frequency: 1 },
  });
  if (existingPriceId && existingPriceId !== price.id) {
    await paddle.prices.update(existingPriceId, { status: "archived" }).catch(() => {});
  }
  return price.id;
}

async function syncOneEnvironment(paddle: Paddle, plan: Plan, environment: PaddleEnvironment) {
  const productIdField = environment === "production" ? "paddleProductIdProduction" : "paddleProductIdSandbox";
  const monthlyIdField = environment === "production" ? "paddleMonthlyPriceIdProduction" : "paddleMonthlyPriceIdSandbox";
  const yearlyIdField = environment === "production" ? "paddleYearlyPriceIdProduction" : "paddleYearlyPriceIdSandbox";

  let productId = plan[productIdField];
  if (productId) {
    await paddle.products.update(productId, { name: plan.name, description: plan.description ?? undefined });
  } else {
    const product = await paddle.products.create({ name: plan.name, taxCategory: "saas", description: plan.description ?? undefined });
    productId = product.id;
  }

  const monthlyPriceId = await syncOnePrice(paddle, productId, plan.name, plan.priceMonthlyCents, plan[monthlyIdField], "month");
  const yearlyPriceId = await syncOnePrice(paddle, productId, plan.name, plan.priceYearlyCents, plan[yearlyIdField], "year");

  const updates: Record<string, string | null> = { [productIdField]: productId };
  if (monthlyPriceId) updates[monthlyIdField] = monthlyPriceId;
  if (yearlyPriceId) updates[yearlyIdField] = yearlyPriceId;
  return updates;
}

/**
 * Pushes a plan to Paddle as a Product + monthly (and, if priced, yearly) recurring Price, for one
 * or both environments — the admin picks which, since sandbox and production are separate Paddle
 * accounts/catalogs.
 *
 * Re-running it updates the existing product's name/description in place. Paddle prices are
 * immutable, so if a plan's price changed since the last sync, a new Price is created and the old
 * one is archived (existing subscribers keep billing at their original price, as normal).
 */
export async function syncPlanToPaddle(planId: string, targets: PaddleEnvironment[]): Promise<{ success: true } | { error: string }> {
  await assertAdmin();
  if (targets.length === 0) return { error: "Pick sandbox, production, or both." };

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return { error: "Plan not found." };
  if (plan.priceMonthlyCents <= 0) return { error: "Free plans don't need a Paddle product." };

  const updates: Record<string, string | null> = {};
  for (const environment of targets) {
    const paddle = await getPaddleClientFor(environment);
    if (!paddle) return { error: `No Paddle API key set for ${environment} in Settings → Payments.` };
    try {
      Object.assign(updates, await syncOneEnvironment(paddle, plan, environment));
    } catch (err) {
      console.error(`Paddle sync (${environment}) failed:`, err);
      return { error: `${environment}: ${err instanceof Error ? err.message : "Failed to sync with Paddle."}` };
    }
  }

  await prisma.plan.update({ where: { id: planId }, data: updates });
  revalidatePath("/admin/plans");
  revalidatePath("/pricing");
  revalidatePath("/dashboard/subscription");
  return { success: true };
}
