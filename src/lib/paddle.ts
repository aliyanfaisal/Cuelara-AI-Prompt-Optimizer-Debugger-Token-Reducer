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

/** A ready-to-use Paddle Node SDK client for whichever environment is currently live, or null if no API key is set. */
export async function getPaddleClient(): Promise<Paddle | null> {
  const { apiKey, environment } = await getPaddleSettings();
  if (!apiKey) return null;
  return new Paddle(apiKey, { environment: environment === "production" ? Environment.production : Environment.sandbox });
}

/** Same as getPaddleClient, but for a specific environment regardless of which one is live — used by admin actions (e.g. syncing a plan) that target sandbox/production explicitly. */
export async function getPaddleClientFor(environment: PaddleEnvironment): Promise<Paddle | null> {
  const { apiKey } = await getPaddleCredentialsFor(environment);
  if (!apiKey) return null;
  return new Paddle(apiKey, { environment: environment === "production" ? Environment.production : Environment.sandbox });
}

// A transaction id for updating the card on a subscription: opening Paddle.js's checkout overlay
// with this id (Checkout.open({ transactionId })) shows Paddle's card form inline on our own page,
// instead of sending the customer to a Paddle-hosted URL. Null if Paddle isn't configured or the
// subscription can't be found (e.g. already canceled).
export async function getPaymentMethodChangeTransactionId(subscriptionId: string): Promise<string | null> {
  const paddle = await getPaddleClient();
  if (!paddle) return null;
  try {
    const transaction = await paddle.subscriptions.getPaymentMethodChangeTransaction(subscriptionId);
    return transaction.id;
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
