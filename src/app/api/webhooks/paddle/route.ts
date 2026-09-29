import { NextResponse } from "next/server";
import { EventName, type Subscription, type Transaction } from "@paddle/paddle-node-sdk";
import { prisma } from "@/lib/prisma";
import { getPaddleClient, getPaddleSettings } from "@/lib/paddle";

export const runtime = "nodejs";

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

// Attribute a subscription event to one of our users: the checkout button sends our userId as
// Paddle customData, which Paddle echoes back on every event for that subscription. Fall back to
// matching by subscription/customer id for events (e.g. a dashboard-side cancel) that might not carry it.
async function findUserForSubscription(subscription: Subscription) {
  const customData = subscription.customData as Record<string, unknown> | null;
  const userId = typeof customData?.userId === "string" ? customData.userId : undefined;

  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) return user;
  }
  return prisma.user.findFirst({
    where: { OR: [{ paddleSubscriptionId: subscription.id }, { paddleCustomerId: subscription.customerId }] },
  });
}

async function syncSubscription(subscription: Subscription, environment: "sandbox" | "production") {
  const user = await findUserForSubscription(subscription);
  if (!user) return;

  const isCanceled = subscription.status === "canceled";
  const priceId = subscription.items[0]?.price?.id ?? null;
  const plan = priceId
    ? await prisma.plan.findFirst({ where: environment === "production" ? { paddlePriceIdProduction: priceId } : { paddlePriceIdSandbox: priceId } })
    : null;

  let planId = user.planId;
  if (isCanceled) {
    const fallback = await prisma.plan.findFirst({ where: { isDefault: true } });
    planId = fallback?.id ?? null;
  } else if (ACTIVE_STATUSES.has(subscription.status) && plan) {
    planId = plan.id;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      planId,
      paddleCustomerId: subscription.customerId,
      paddleSubscriptionId: isCanceled ? null : subscription.id,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: subscription.currentBillingPeriod?.endsAt ? new Date(subscription.currentBillingPeriod.endsAt) : null,
    },
  });
}

// Transaction events carry the same customData as their parent subscription (Paddle copies it onto
// every recurring charge), so a fresh transaction can still be attributed even before the matching
// subscription event has landed.
async function findUserForTransaction(transaction: Transaction) {
  const customData = transaction.customData as Record<string, unknown> | null;
  const userId = typeof customData?.userId === "string" ? customData.userId : undefined;

  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) return user;
  }
  const or = [];
  if (transaction.subscriptionId) or.push({ paddleSubscriptionId: transaction.subscriptionId });
  if (transaction.customerId) or.push({ paddleCustomerId: transaction.customerId });
  if (or.length === 0) return null;
  return prisma.user.findFirst({ where: { OR: or } });
}

// One row per charge (initial subscription payment or a renewal), for the payment-history table on
// /dashboard/payment-methods. Also the only place the card-on-file summary (brand/last4/expiry) is
// updated — Paddle attaches the payment method actually used to each transaction's payment attempts.
async function syncTransaction(transaction: Transaction) {
  const user = await findUserForTransaction(transaction);
  if (!user) return;

  const totals = transaction.details?.totals;
  const amountCents = totals ? Math.round(Number(totals.grandTotal)) : 0;
  const currencyCode = totals?.currencyCode ?? transaction.currencyCode;

  await prisma.paymentTransaction.upsert({
    where: { paddleTransactionId: transaction.id },
    update: { status: transaction.status, amountCents, currencyCode, billedAt: transaction.billedAt ? new Date(transaction.billedAt) : null },
    create: {
      userId: user.id,
      paddleTransactionId: transaction.id,
      status: transaction.status,
      amountCents,
      currencyCode,
      billedAt: transaction.billedAt ? new Date(transaction.billedAt) : null,
    },
  });

  const card = transaction.payments.find((p) => p.methodDetails?.card)?.methodDetails?.card;
  if (card) {
    await prisma.user.update({
      where: { id: user.id },
      data: { cardBrand: card.type, cardLast4: card.last4, cardExpiryMonth: card.expiryMonth, cardExpiryYear: card.expiryYear },
    });
  }
}

export async function POST(request: Request) {
  const { webhookSecret, environment } = await getPaddleSettings();
  const paddle = await getPaddleClient();
  if (!webhookSecret || !paddle) {
    return NextResponse.json({ error: "Paddle is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("paddle-signature") ?? "";
  const rawBody = await request.text();
  if (!signature || !rawBody) {
    return NextResponse.json({ error: "Missing signature or body." }, { status: 400 });
  }

  try {
    const event = await paddle.webhooks.unmarshal(rawBody, webhookSecret, signature);
    if (!event) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });

    switch (event.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionActivated:
      case EventName.SubscriptionUpdated:
      case EventName.SubscriptionTrialing:
      case EventName.SubscriptionPastDue:
      case EventName.SubscriptionPaused:
      case EventName.SubscriptionResumed:
      case EventName.SubscriptionCanceled:
        await syncSubscription(event.data as Subscription, environment);
        break;
      case EventName.TransactionBilled:
      case EventName.TransactionPaid:
      case EventName.TransactionCompleted:
      case EventName.TransactionPastDue:
      case EventName.TransactionPaymentFailed:
      case EventName.TransactionCanceled:
        await syncTransaction(event.data as Transaction);
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paddle webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 400 });
  }
}
