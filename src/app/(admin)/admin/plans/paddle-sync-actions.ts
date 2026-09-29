"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/admin-auth";
import { getActivePaddleEnvironment, getPaddleClient } from "@/lib/paddle";

/**
 * Pushes a plan to Paddle as a Product + monthly recurring Price, for whichever environment
 * (sandbox/production) is currently live in /admin/settings — so a plan can be wired up for
 * self-serve checkout without ever leaving this admin screen.
 *
 * Re-running it updates the existing product's name/description in place. Paddle prices are
 * immutable, so if the plan's price changed since the last sync, a new Price is created and the
 * old one is archived (existing subscribers keep billing at their original price, as normal).
 */
export async function syncPlanToPaddle(planId: string): Promise<{ success: true; priceId: string } | { error: string }> {
  await assertAdmin();

  const paddle = await getPaddleClient();
  if (!paddle) return { error: "Set a Paddle API key in Settings → Payments first." };

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return { error: "Plan not found." };
  if (plan.priceMonthlyCents <= 0) return { error: "Free plans don't need a Paddle product." };

  const environment = await getActivePaddleEnvironment();
  const productIdField = environment === "production" ? "paddleProductIdProduction" : "paddleProductIdSandbox";
  const priceIdField = environment === "production" ? "paddlePriceIdProduction" : "paddlePriceIdSandbox";
  const existingProductId = plan[productIdField];
  const existingPriceId = plan[priceIdField];

  try {
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

    await prisma.plan.update({ where: { id: planId }, data: { [productIdField]: productId, [priceIdField]: priceId } });
    revalidatePath("/admin/plans");
    revalidatePath("/pricing");
    revalidatePath("/dashboard/subscription");
    return { success: true, priceId };
  } catch (err) {
    console.error("Paddle sync failed:", err);
    return { error: err instanceof Error ? err.message : "Failed to sync with Paddle." };
  }
}
