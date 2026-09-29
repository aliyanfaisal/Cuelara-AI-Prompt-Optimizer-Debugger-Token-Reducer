import { NextResponse } from "next/server";
import { EventName, type Subscription, type Transaction } from "@paddle/paddle-node-sdk";
import { prisma } from "@/lib/prisma";
import { getPaddleClient, getPaddleSettings, type PaddleEnvironment } from "@/lib/paddle";
import { sendPlanChangeEmail, sendPaymentFailedEmail } from "@/lib/email";

export const runtime = "nodejs";

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

// Tracks subscription lifecycle (id/customer/status/renewal date) and handles cancellation, but never
// grants a plan itself — a subscription can exist before its first payment actually succeeds, so
// granting access happens only in syncTransaction, once a charge is confirmed paid.
async function syncSubscription(subscription: Subscription) {
  const user = await findUserForSubscription(subscription);
  if (!user) return;

  const isCanceled = subscription.status === "canceled";
  let planId = user.planId;
  if (isCanceled) {
    const fallback = await prisma.plan.findFirst({ where: { isDefault: true } });
    planId = fallback?.id ?? null;
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

type TransactionOutcome = "confirmed" | "failed" | "other";

// One row per charge (initial subscription payment or a renewal), for the payment-history table on
// /dashboard/payment-methods. Also where the card-on-file summary is updated, the plan is actually
// granted (only once a charge is confirmed paid — never on subscription creation alone), and the
// success/failure email goes out. "outcome" comes from which webhook event fired (not transaction.status,
// which never actually holds a "payment_failed" value — that only exists as an event name). Both the
// grant and the email fire at most once per transaction id, guarded by whether we'd already recorded it —
// webhooks can and do redeliver the same event.
async function syncTransaction(transaction: Transaction, environment: PaddleEnvironment, outcome: TransactionOutcome) {
  const user = await findUserForTransaction(transaction);
  if (!user) return;

  const previous = await prisma.paymentTransaction.findUnique({ where: { paddleTransactionId: transaction.id }, select: { id: true } });
  const isFirstTimeSeen = !previous;

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

  if (outcome === "confirmed" && isFirstTimeSeen) {
    const priceId = transaction.items[0]?.price?.id ?? null;
    const plan = priceId
      ? await prisma.plan.findFirst({
          where:
            environment === "production"
              ? { OR: [{ paddleMonthlyPriceIdProduction: priceId }, { paddleYearlyPriceIdProduction: priceId }] }
              : { OR: [{ paddleMonthlyPriceIdSandbox: priceId }, { paddleYearlyPriceIdSandbox: priceId }] },
        })
      : null;

    if (plan) {
      await prisma.user.update({ where: { id: user.id }, data: { planId: plan.id } });
      if (user.email) await sendPlanChangeEmail(user.email, plan.name).catch((e) => console.error("Plan change email failed:", e));
    }
  } else if (outcome === "failed" && isFirstTimeSeen) {
    const plan = user.planId ? await prisma.plan.findUnique({ where: { id: user.planId }, select: { name: true } }) : null;
    if (user.email) await sendPaymentFailedEmail(user.email, plan?.name ?? "your plan").catch((e) => console.error("Payment failed email failed:", e));
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
        await syncSubscription(event.data as Subscription);
        break;
      case EventName.TransactionPaid:
      case EventName.TransactionCompleted:
        await syncTransaction(event.data as Transaction, environment, "confirmed");
        break;
      case EventName.TransactionPaymentFailed:
        await syncTransaction(event.data as Transaction, environment, "failed");
        break;
      case EventName.TransactionBilled:
      case EventName.TransactionPastDue:
      case EventName.TransactionCanceled:
        await syncTransaction(event.data as Transaction, environment, "other");
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
