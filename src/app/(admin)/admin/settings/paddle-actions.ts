"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-auth";
import { getPaddleSettings, type PaddleEnvironment } from "@/lib/paddle";
import { PADDLE_API_KEY_KEY, PADDLE_CLIENT_TOKEN_KEY, PADDLE_ENVIRONMENT_KEY, PADDLE_WEBHOOK_SECRET_KEY } from "@/lib/tool-settings-keys";

export interface PaddleSettingsView {
  environment: PaddleEnvironment;
  clientToken: string;
  // Secrets are masked — the admin sees whether one is set, not its value, and only overwrites it by entering a new one.
  hasApiKey: boolean;
  hasWebhookSecret: boolean;
}

export async function getPaddleSettingsForAdmin(): Promise<PaddleSettingsView> {
  await assertAdmin();
  const s = await getPaddleSettings();
  return {
    environment: s.environment,
    clientToken: s.clientToken,
    hasApiKey: s.apiKey.length > 0,
    hasWebhookSecret: s.webhookSecret.length > 0,
  };
}

export async function updatePaddleSettings(data: {
  environment: PaddleEnvironment;
  clientToken: string;
  apiKey: string; // "" = leave the stored key untouched
  webhookSecret: string; // "" = leave the stored secret untouched
}) {
  await assertAdmin();
  if (data.environment !== "sandbox" && data.environment !== "production") {
    return { error: "Invalid environment." };
  }

  try {
    const writes = [
      prisma.setting.upsert({
        where: { key: PADDLE_ENVIRONMENT_KEY },
        update: { value: data.environment },
        create: { key: PADDLE_ENVIRONMENT_KEY, value: data.environment },
      }),
      prisma.setting.upsert({
        where: { key: PADDLE_CLIENT_TOKEN_KEY },
        update: { value: data.clientToken.trim() },
        create: { key: PADDLE_CLIENT_TOKEN_KEY, value: data.clientToken.trim() },
      }),
    ];
    if (data.apiKey.trim()) {
      writes.push(
        prisma.setting.upsert({
          where: { key: PADDLE_API_KEY_KEY },
          update: { value: data.apiKey.trim() },
          create: { key: PADDLE_API_KEY_KEY, value: data.apiKey.trim() },
        })
      );
    }
    if (data.webhookSecret.trim()) {
      writes.push(
        prisma.setting.upsert({
          where: { key: PADDLE_WEBHOOK_SECRET_KEY },
          update: { value: data.webhookSecret.trim() },
          create: { key: PADDLE_WEBHOOK_SECRET_KEY, value: data.webhookSecret.trim() },
        })
      );
    }
    await Promise.all(writes);
    revalidatePath("/admin/settings");
    return { success: true };
  } catch {
    return { error: "Failed to update Paddle settings." };
  }
}
