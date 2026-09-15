"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isProvider, type Provider } from "@/lib/providers";

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
  const grouped: Record<Provider, ApiKeyRow[]> = { gemini: [], grok: [], openai: [], claude: [] };

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
