"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-auth";
import { getActivePaddleEnvironment, getPaddleCredentialsFor, type PaddleEnvironment } from "@/lib/paddle";
import {
  PADDLE_ENVIRONMENT_KEY,
  PADDLE_SANDBOX_API_KEY_KEY,
  PADDLE_SANDBOX_CLIENT_TOKEN_KEY,
  PADDLE_SANDBOX_WEBHOOK_SECRET_KEY,
  PADDLE_PRODUCTION_API_KEY_KEY,
  PADDLE_PRODUCTION_CLIENT_TOKEN_KEY,
  PADDLE_PRODUCTION_WEBHOOK_SECRET_KEY,
} from "@/lib/tool-settings-keys";

const KEYS_BY_ENV = {
  sandbox: { apiKey: PADDLE_SANDBOX_API_KEY_KEY, clientToken: PADDLE_SANDBOX_CLIENT_TOKEN_KEY, webhookSecret: PADDLE_SANDBOX_WEBHOOK_SECRET_KEY },
  production: { apiKey: PADDLE_PRODUCTION_API_KEY_KEY, clientToken: PADDLE_PRODUCTION_CLIENT_TOKEN_KEY, webhookSecret: PADDLE_PRODUCTION_WEBHOOK_SECRET_KEY },
} as const;

export interface PaddleEnvironmentView {
  clientToken: string;
  // Secrets are masked — the admin sees whether one is set, not its value, and only overwrites it by entering a new one.
  hasApiKey: boolean;
  hasWebhookSecret: boolean;
}

export interface PaddleSettingsView {
  environment: PaddleEnvironment;
  sandbox: PaddleEnvironmentView;
  production: PaddleEnvironmentView;
}

export async function getPaddleSettingsForAdmin(): Promise<PaddleSettingsView> {
  await assertAdmin();
  const [environment, sandbox, production] = await Promise.all([
    getActivePaddleEnvironment(),
    getPaddleCredentialsFor("sandbox"),
    getPaddleCredentialsFor("production"),
  ]);
  return {
    environment,
    sandbox: { clientToken: sandbox.clientToken, hasApiKey: sandbox.apiKey.length > 0, hasWebhookSecret: sandbox.webhookSecret.length > 0 },
    production: { clientToken: production.clientToken, hasApiKey: production.apiKey.length > 0, hasWebhookSecret: production.webhookSecret.length > 0 },
  };
}

/** Sets which environment (sandbox/production) is actually used for checkout and webhooks. */
export async function setActivePaddleEnvironment(environment: PaddleEnvironment) {
  await assertAdmin();
  if (environment !== "sandbox" && environment !== "production") return { error: "Invalid environment." };
  try {
    await prisma.setting.upsert({
      where: { key: PADDLE_ENVIRONMENT_KEY },
      update: { value: environment },
      create: { key: PADDLE_ENVIRONMENT_KEY, value: environment },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/pricing");
    return { success: true };
  } catch {
    return { error: "Failed to switch environment." };
  }
}

export async function updatePaddleEnvironmentCredentials(
  environment: PaddleEnvironment,
  data: {
    clientToken: string;
    apiKey: string; // "" = leave the stored key untouched
    webhookSecret: string; // "" = leave the stored secret untouched
  }
) {
  await assertAdmin();
  if (environment !== "sandbox" && environment !== "production") return { error: "Invalid environment." };
  const keys = KEYS_BY_ENV[environment];

  try {
    const writes = [
      prisma.setting.upsert({
        where: { key: keys.clientToken },
        update: { value: data.clientToken.trim() },
        create: { key: keys.clientToken, value: data.clientToken.trim() },
      }),
    ];
    if (data.apiKey.trim()) {
      writes.push(
        prisma.setting.upsert({
          where: { key: keys.apiKey },
          update: { value: data.apiKey.trim() },
          create: { key: keys.apiKey, value: data.apiKey.trim() },
        })
      );
    }
    if (data.webhookSecret.trim()) {
      writes.push(
        prisma.setting.upsert({
          where: { key: keys.webhookSecret },
          update: { value: data.webhookSecret.trim() },
          create: { key: keys.webhookSecret, value: data.webhookSecret.trim() },
        })
      );
    }
    await Promise.all(writes);
    revalidatePath("/admin/settings");
    return { success: true };
  } catch {
    return { error: `Failed to update ${environment} settings.` };
  }
}
