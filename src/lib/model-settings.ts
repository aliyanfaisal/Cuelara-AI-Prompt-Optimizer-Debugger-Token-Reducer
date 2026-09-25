import "server-only";
import { prisma } from "@/lib/prisma";
import { MODEL_ORDER_KEY, OPENROUTER_SELECTED_MODELS_KEY } from "@/lib/tool-settings-keys";
import { ORDERABLE_PROVIDERS, MAX_OPENROUTER_MODELS, type OrderableProvider } from "@/lib/model-order";

async function readJsonArray(key: string): Promise<string[]> {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    const parsed = row ? JSON.parse(row.value) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

async function writeJson(key: string, value: string[]) {
  const json = JSON.stringify(value);
  await prisma.setting.upsert({ where: { key }, update: { value: json }, create: { key, value: json } });
}

/** Admin-chosen priority; anything missing from the saved list is appended so a new provider is never dropped. */
export async function getModelOrder(): Promise<OrderableProvider[]> {
  const saved = (await readJsonArray(MODEL_ORDER_KEY)).filter((p): p is OrderableProvider =>
    (ORDERABLE_PROVIDERS as readonly string[]).includes(p)
  );
  const unique = Array.from(new Set(saved));
  return [...unique, ...ORDERABLE_PROVIDERS.filter((p) => !unique.includes(p))];
}

export async function setModelOrder(order: OrderableProvider[]) {
  await writeJson(MODEL_ORDER_KEY, order);
}

/** The OpenRouter models the admin picked, in the order they should be tried (empty = automatic). */
export async function getSelectedOpenRouterModels(): Promise<string[]> {
  return (await readJsonArray(OPENROUTER_SELECTED_MODELS_KEY)).slice(0, MAX_OPENROUTER_MODELS);
}

export async function setSelectedOpenRouterModels(models: string[]) {
  await writeJson(OPENROUTER_SELECTED_MODELS_KEY, models.slice(0, MAX_OPENROUTER_MODELS));
}
