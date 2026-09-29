import "server-only";
import { Paddle, Environment } from "@paddle/paddle-node-sdk";
import { prisma } from "@/lib/prisma";
import {
  PADDLE_ENVIRONMENT_KEY,
  PADDLE_SANDBOX_API_KEY_KEY,
  PADDLE_SANDBOX_CLIENT_TOKEN_KEY,
  PADDLE_SANDBOX_WEBHOOK_SECRET_KEY,
  PADDLE_PRODUCTION_API_KEY_KEY,
  PADDLE_PRODUCTION_CLIENT_TOKEN_KEY,
  PADDLE_PRODUCTION_WEBHOOK_SECRET_KEY,
} from "@/lib/tool-settings-keys";

export type PaddleEnvironment = "sandbox" | "production";

export interface PaddleEnvironmentCredentials {
  apiKey: string;
  clientToken: string;
  webhookSecret: string;
}

export interface PaddleSettings extends PaddleEnvironmentCredentials {
  environment: PaddleEnvironment;
}

const KEYS_BY_ENV = {
  sandbox: { apiKey: PADDLE_SANDBOX_API_KEY_KEY, clientToken: PADDLE_SANDBOX_CLIENT_TOKEN_KEY, webhookSecret: PADDLE_SANDBOX_WEBHOOK_SECRET_KEY },
  production: { apiKey: PADDLE_PRODUCTION_API_KEY_KEY, clientToken: PADDLE_PRODUCTION_CLIENT_TOKEN_KEY, webhookSecret: PADDLE_PRODUCTION_WEBHOOK_SECRET_KEY },
} as const;

// All Paddle config lives in the Setting table (admin-controlled, see /admin/settings Payments tab) rather
// than env vars, so it can be changed without a redeploy. Sandbox and production are separate Paddle
// accounts with separate keys, both stored at once — the environment toggle just picks which is active.
export async function getPaddleSettings(): Promise<PaddleSettings> {
  const environment = await getActivePaddleEnvironment();
  const credentials = await getPaddleCredentialsFor(environment);
  return { environment, ...credentials };
}

export async function getActivePaddleEnvironment(): Promise<PaddleEnvironment> {
  const row = await prisma.setting.findUnique({ where: { key: PADDLE_ENVIRONMENT_KEY } });
  return row?.value === "production" ? "production" : "sandbox";
}

export async function getPaddleCredentialsFor(environment: PaddleEnvironment): Promise<PaddleEnvironmentCredentials> {
  const keys = KEYS_BY_ENV[environment];
  const rows = await prisma.setting.findMany({ where: { key: { in: [keys.apiKey, keys.clientToken, keys.webhookSecret] } } });
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    apiKey: byKey[keys.apiKey] ?? "",
    clientToken: byKey[keys.clientToken] ?? "",
    webhookSecret: byKey[keys.webhookSecret] ?? "",
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
