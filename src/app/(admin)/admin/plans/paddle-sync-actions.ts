"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/admin-auth";
import { getPaddleClientFor, type PaddleEnvironment } from "@/lib/paddle";
import type { Paddle } from "@paddle/paddle-node-sdk";
import type { Plan } from "@/generated/client/client";

async function syncOneEnvironment(paddle: Paddle, plan: Plan, environment: PaddleEnvironment) {
  const productIdField = environment === "production" ? "paddleProductIdProduction" : "paddleProductIdSandbox";
  const priceIdField = environment === "production" ? "paddlePriceIdProduction" : "paddlePriceIdSandbox";
  const existingProductId = plan[productIdField];
  const existingPriceId = plan[priceIdField];

  let productId = existingProductId;
  if (productId) {
    await paddle.products.update(productId, { name: plan.name, description: plan.description ?? undefined });
  } else {
    const product = await paddle.products.create({ name: plan.name, taxCategory: "saas", description: plan.description ?? undefined });
    productId = product.id;
  }

  // Only mint a new price if the amount actually changed since the last sync — Paddle prices are
  // immutable, so re-syncing just to fix the product name shouldn't churn the price catalog.
  let priceId = existingPriceId;
  let currentAmount: string | null = null;
  if (existingPriceId) {
    currentAmount = await paddle.prices
      .get(existingPriceId)
      .then((p) => p.unitPrice.amount)
      .catch(() => null);
  }

  if (!priceId || currentAmount !== String(plan.priceMonthlyCents)) {
    const price = await paddle.prices.create({
      productId,
      description: `${plan.name} — monthly`,
      unitPrice: { amount: String(plan.priceMonthlyCents), currencyCode: "USD" },
      billingCycle: { interval: "month", frequency: 1 },
    });
    if (existingPriceId && existingPriceId !== price.id) {
      await paddle.prices.update(existingPriceId, { status: "archived" }).catch(() => {});
    }
    priceId = price.id;
  }

  return { [productIdField]: productId, [priceIdField]: priceId };
}

/**
 * Pushes a plan to Paddle as a Product + monthly recurring Price, for one or both environments —
 * the admin picks which, since sandbox and production are separate Paddle accounts/catalogs.
 *
 * Re-running it updates the existing product's name/description in place. Paddle prices are
 * immutable, so if the plan's price changed since the last sync, a new Price is created and the
 * old one is archived (existing subscribers keep billing at their original price, as normal).
 */
export async function syncPlanToPaddle(planId: string, targets: PaddleEnvironment[]): Promise<{ success: true } | { error: string }> {
  await assertAdmin();
  if (targets.length === 0) return { error: "Pick sandbox, production, or both." };

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return { error: "Plan not found." };
  if (plan.priceMonthlyCents <= 0) return { error: "Free plans don't need a Paddle product." };

  const updates: Record<string, string> = {};
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
