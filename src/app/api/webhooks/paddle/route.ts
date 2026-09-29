import { NextResponse } from "next/server";
import { EventName, type Subscription } from "@paddle/paddle-node-sdk";
import { prisma } from "@/lib/prisma";
import { getPaddleClient, getPaddleSettings } from "@/lib/paddle";

export const runtime = "nodejs";

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

// Attribute a subscription event to one of our users: the checkout button sends our userId as
// Paddle customData, which Paddle echoes back on every event for that subscription. Fall back to
// matching by subscription/customer id for events (e.g. a dashboard-side cancel) that might not carry it.
async function findUser(subscription: Subscription) {
  const customData = subscription.customData as Record<string, unknown> | null;
  const userId = typeof customData?.userId === "string" ? customData.userId : undefined;

  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) return user;
  }
  const byRelatedIds = await prisma.user.findFirst({
    where: { OR: [{ paddleSubscriptionId: subscription.id }, { paddleCustomerId: subscription.customerId }] },
  });
  return byRelatedIds;
}

async function syncSubscription(subscription: Subscription) {
  const user = await findUser(subscription);
  if (!user) return;

  const isCanceled = subscription.status === "canceled";
  const priceId = subscription.items[0]?.price?.id ?? null;
  const plan = priceId ? await prisma.plan.findFirst({ where: { paddlePriceId: priceId } }) : null;

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

export async function POST(request: Request) {
  const { webhookSecret } = await getPaddleSettings();
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
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paddle webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 400 });
  }
}
