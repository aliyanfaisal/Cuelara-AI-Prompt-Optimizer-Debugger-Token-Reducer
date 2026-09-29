"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { cancelPaddleSubscription, getPaymentMethodChangeTransactionId } from "@/lib/paddle";

type Result<T = unknown> = ({ success: true } & T) | { error: string };

const UNAUTHORIZED = { error: "Please sign in again." };

/** A Paddle transaction id to open inline via Checkout.open({ transactionId }) to update the card on file. */
export async function requestCardUpdateTransaction(): Promise<Result<{ transactionId: string }>> {
  const session = await getSessionUser();
  if (!session) return UNAUTHORIZED;

  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { paddleSubscriptionId: true } });
  if (!user?.paddleSubscriptionId) return { error: "No active subscription to update." };

  const transactionId = await getPaymentMethodChangeTransactionId(user.paddleSubscriptionId);
  if (!transactionId) return { error: "Couldn't start the card update. Try again shortly." };
  return { success: true, transactionId };
}

export async function cancelMySubscription(): Promise<Result> {
  const session = await getSessionUser();
  if (!session) return UNAUTHORIZED;

  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { paddleSubscriptionId: true } });
  if (!user?.paddleSubscriptionId) return { error: "No active subscription to cancel." };

  await cancelPaddleSubscription(user.paddleSubscriptionId);
  const fallback = await prisma.plan.findFirst({ where: { isDefault: true } });
  await prisma.user.update({
    where: { id: session.id },
    data: { planId: fallback?.id ?? null, paddleSubscriptionId: null, subscriptionStatus: "canceled" },
  });

  revalidatePath("/dashboard", "layout");
  return { success: true };
}
