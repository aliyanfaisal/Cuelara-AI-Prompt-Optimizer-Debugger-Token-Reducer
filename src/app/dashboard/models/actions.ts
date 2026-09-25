"use server";

import { revalidatePath } from "next/cache";
import { pruneToolRuns } from "@/lib/history";
import { getEffectivePlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { isProvider, PROVIDERS, type Provider } from "@/lib/providers";
import { ORDERABLE_PROVIDERS, MAX_OPENROUTER_MODELS } from "@/lib/model-order";
import { getSessionUser } from "@/lib/session-user";
import { listFreeOpenRouterModels } from "@/lib/openrouter-free-models";
import { parseStringArray, resolveOrder } from "@/lib/user-keys";
import type { OrderableProvider } from "@/lib/model-order";

type Result = { success: true; message?: string } | { error: string };

// The providers a tool can actually call today (Grok / ChatGPT / Claude aren't wired to any tool).
const CUSTOMER_PROVIDERS = PROVIDERS.filter((p): p is Provider => (ORDERABLE_PROVIDERS as readonly string[]).includes(p));

export interface OwnKeyRow {
  id: string;
  provider: Provider;
  /** Masked — the full key is never sent back to the browser. */
  maskedKey: string;
  label: string | null;
  isActive: boolean;
}

export interface OwnModelsState {
  keysByProvider: Record<string, OwnKeyRow[]>;
  useOwnKeys: boolean;
  order: OrderableProvider[];
  openRouterModels: string[];
  freeModels: { id: string; contextLength?: number }[];
}

function mask(key: string): string {
  return key.length <= 4 ? "••••" : `••••••••${key.slice(-4)}`;
}

export async function getOwnModelsState(userId: string): Promise<OwnModelsState> {
  const [rows, config, free] = await Promise.all([
    prisma.apiKey.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.userModelConfig.findUnique({ where: { userId } }),
    listFreeOpenRouterModels(),
  ]);
  const keysByProvider: Record<string, OwnKeyRow[]> = Object.fromEntries(CUSTOMER_PROVIDERS.map((p) => [p, []]));
  for (const row of rows) {
    if (!isProvider(row.provider) || !keysByProvider[row.provider]) continue;
    keysByProvider[row.provider].push({ id: row.id, provider: row.provider, maskedKey: mask(row.key), label: row.label, isActive: row.isActive });
  }
  return {
    keysByProvider,
    useOwnKeys: config?.useOwnKeys ?? false,
    order: resolveOrder(config?.order),
    openRouterModels: parseStringArray(config?.openRouterModels).slice(0, MAX_OPENROUTER_MODELS),
    freeModels: free.map((m) => ({ id: m.id, contextLength: m.contextLength })),
  };
}

/** Signed in AND on a plan that allows own keys — every mutation below goes through this. */
async function requireOwnKeysUser(): Promise<string | null> {
  const session = await getSessionUser();
  if (!session) return null;
  const plan = await getEffectivePlan(session.id);
  return plan?.allowsOwnKeys ? session.id : null;
}

const NOT_ALLOWED: Result = { error: "Your plan doesn't include your own model keys." };

/** Moves the customer onto the (free) bring-your-own-keys plan. Self-serve: they carry the provider costs. */
export async function activateOwnKeysPlan(): Promise<Result> {
  const session = await getSessionUser();
  if (!session) return { error: "Please sign in again." };
  const target = await prisma.plan.findFirst({ where: { allowsOwnKeys: true, isActive: true }, orderBy: { priceMonthlyCents: "asc" }, select: { id: true, name: true, historyPerTool: true } });
  if (!target) return { error: "This plan isn't available yet." };

  await prisma.user.update({ where: { id: session.id }, data: { planId: target.id } });
  await pruneToolRuns(session.id, target.historyPerTool);
  revalidatePath("/dashboard", "layout");
  return { success: true, message: `You're now on the ${target.name} plan.` };
}

export async function addOwnKey(provider: string, key: string, label: string): Promise<Result> {
  const userId = await requireOwnKeysUser();
  if (!userId) return NOT_ALLOWED;
  if (!isProvider(provider) || !CUSTOMER_PROVIDERS.includes(provider)) return { error: "Invalid provider." };
  if (!key.trim()) return { error: "API key cannot be empty." };
  await prisma.apiKey.create({ data: { provider, key: key.trim(), label: label.trim() || null, userId } });
  revalidatePath("/dashboard/models");
  return { success: true };
}

export async function deleteOwnKey(id: string): Promise<Result> {
  const userId = await requireOwnKeysUser();
  if (!userId) return NOT_ALLOWED;
  await prisma.apiKey.deleteMany({ where: { id, userId } });
  revalidatePath("/dashboard/models");
  return { success: true };
}

export async function setOwnKeyActive(id: string, isActive: boolean): Promise<Result> {
  const userId = await requireOwnKeysUser();
  if (!userId) return NOT_ALLOWED;
  await prisma.apiKey.updateMany({ where: { id, userId }, data: { isActive } });
  revalidatePath("/dashboard/models");
  return { success: true };
}

export async function setUseOwnKeys(useOwnKeys: boolean): Promise<Result> {
  const userId = await requireOwnKeysUser();
  if (!userId) return NOT_ALLOWED;
  await prisma.userModelConfig.upsert({ where: { userId }, create: { userId, useOwnKeys }, update: { useOwnKeys } });
  revalidatePath("/dashboard/models");
  return { success: true };
}

export async function updateOwnOrder(order: string[]): Promise<Result> {
  const userId = await requireOwnKeysUser();
  if (!userId) return NOT_ALLOWED;
  if (order.length !== ORDERABLE_PROVIDERS.length || !ORDERABLE_PROVIDERS.every((p) => order.includes(p))) return { error: "Invalid model order." };
  const json = JSON.stringify(order);
  await prisma.userModelConfig.upsert({ where: { userId }, create: { userId, order: json }, update: { order: json } });
  return { success: true };
}

export async function updateOwnOpenRouterModels(models: string[]): Promise<Result> {
  const userId = await requireOwnKeysUser();
  if (!userId) return NOT_ALLOWED;
  const json = JSON.stringify(Array.from(new Set(models.map((m) => m.trim()).filter(Boolean))).slice(0, MAX_OPENROUTER_MODELS));
  await prisma.userModelConfig.upsert({ where: { userId }, create: { userId, openRouterModels: json }, update: { openRouterModels: json } });
  return { success: true };
}
