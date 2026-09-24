"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isProvider, type Provider } from "@/lib/providers";
import { setOpenRouterModelMode, OPENROUTER_MODEL_MODES, type OpenRouterModelMode } from "@/lib/openrouter-mode";

export async function updateOpenRouterModelMode(mode: string) {
  if (!(OPENROUTER_MODEL_MODES as readonly string[]).includes(mode)) return { error: "Invalid mode." };
  // "paid" has no model wired to it yet — accepting it here would silently do nothing,
  // which is worse than telling the admin it's not available.
  if (mode === "paid") return { error: "Paid mode isn't available yet — no paid model has been configured." };
  try {
    await setOpenRouterModelMode(mode as OpenRouterModelMode);
    revalidatePath("/admin/settings");
    return { success: true };
  } catch {
    return { error: "Failed to update OpenRouter mode." };
  }
}

export interface ApiKeyRow {
  id: string;
  provider: Provider;
  key: string;
  label: string | null;
  isActive: boolean;
  createdAt: string;
}

export async function getApiKeysGrouped(): Promise<Record<Provider, ApiKeyRow[]>> {
  const rows = await prisma.apiKey.findMany({ orderBy: { createdAt: "asc" } });
  const grouped: Record<Provider, ApiKeyRow[]> = { gemini: [], grok: [], openai: [], claude: [], groq: [], openrouter: [] };

  for (const row of rows) {
    if (!isProvider(row.provider)) continue;
    grouped[row.provider].push({
      id: row.id,
      provider: row.provider,
      key: row.key,
      label: row.label,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
    });
  }
  return grouped;
}

export async function addApiKey(provider: string, key: string, label: string) {
  if (!isProvider(provider)) return { error: "Invalid provider." };
  if (!key.trim()) return { error: "API key cannot be empty." };

  try {
    await prisma.apiKey.create({
      data: { provider, key: key.trim(), label: label.trim() || null },
    });
    revalidatePath("/admin/settings");
    return { success: true };
  } catch {
    return { error: "Failed to add API key." };
  }
}

export async function deleteApiKey(id: string) {
  try {
    await prisma.apiKey.delete({ where: { id } });
    revalidatePath("/admin/settings");
    return { success: true };
  } catch {
    return { error: "Failed to delete API key." };
  }
}

export async function setApiKeyActive(id: string, isActive: boolean) {
  try {
    await prisma.apiKey.update({ where: { id }, data: { isActive } });
    revalidatePath("/admin/settings");
    return { success: true };
  } catch {
    return { error: "Failed to update API key." };
  }
}
