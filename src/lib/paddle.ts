import "server-only";
import { Paddle, Environment } from "@paddle/paddle-node-sdk";
import { prisma } from "@/lib/prisma";
import { PADDLE_API_KEY_KEY, PADDLE_CLIENT_TOKEN_KEY, PADDLE_ENVIRONMENT_KEY, PADDLE_WEBHOOK_SECRET_KEY } from "@/lib/tool-settings-keys";

export type PaddleEnvironment = "sandbox" | "production";

export interface PaddleSettings {
  environment: PaddleEnvironment;
  apiKey: string;
  clientToken: string;
  webhookSecret: string;
}

// All Paddle config lives in the Setting table (admin-controlled, see /admin/settings Payments tab) rather
// than env vars, so it can be changed without a redeploy.
export async function getPaddleSettings(): Promise<PaddleSettings> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [PADDLE_ENVIRONMENT_KEY, PADDLE_API_KEY_KEY, PADDLE_CLIENT_TOKEN_KEY, PADDLE_WEBHOOK_SECRET_KEY] } },
  });
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    environment: byKey[PADDLE_ENVIRONMENT_KEY] === "production" ? "production" : "sandbox",
    apiKey: byKey[PADDLE_API_KEY_KEY] ?? "",
    clientToken: byKey[PADDLE_CLIENT_TOKEN_KEY] ?? "",
    webhookSecret: byKey[PADDLE_WEBHOOK_SECRET_KEY] ?? "",
  };
}

/** A ready-to-use Paddle Node SDK client, or null if the admin hasn't set an API key yet. */
export async function getPaddleClient(): Promise<Paddle | null> {
  const { apiKey, environment } = await getPaddleSettings();
  if (!apiKey) return null;
  return new Paddle(apiKey, { environment: environment === "production" ? Environment.production : Environment.sandbox });
}

// Paddle-hosted links for a subscription: updating the card on file and self-serve cancellation.
// Null if Paddle isn't configured or the subscription can't be found (e.g. already canceled).
export async function getSubscriptionManagementUrls(subscriptionId: string): Promise<{ updatePaymentMethod: string | null; cancel: string } | null> {
  const paddle = await getPaddleClient();
  if (!paddle) return null;
  try {
    const subscription = await paddle.subscriptions.get(subscriptionId);
    return subscription.managementUrls;
  } catch {
    return null;
  }
}

// Cancels a Paddle subscription immediately (stops billing right away) rather than at the end of the
// current period — used when a user downgrades away from a paid plan in the dashboard. The webhook that
// fires from this call is what actually updates the user's row; this just tells Paddle to stop billing.
export async function cancelPaddleSubscription(subscriptionId: string): Promise<void> {
  const paddle = await getPaddleClient();
  if (!paddle) return;
  await paddle.subscriptions.cancel(subscriptionId, { effectiveFrom: "immediately" });
}
