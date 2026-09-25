import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tryDecryptSecret } from "@/lib/secret-box";
import { getEffectivePlan } from "@/lib/plans";
import { isProvider, type Provider } from "@/lib/providers";
import { ORDERABLE_PROVIDERS, MAX_OPENROUTER_MODELS, type OrderableProvider } from "@/lib/model-order";

export interface OwnKeyContext {
  userId: string;
  /** The customer's active keys per provider (only providers they actually have keys for). */
  keys: Partial<Record<Provider, string[]>>;
  order: OrderableProvider[];
  openRouterModels: string[];
}

export function parseStringArray(value: string | null | undefined): string[] {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function resolveOrder(saved: string | null | undefined): OrderableProvider[] {
  const valid = Array.from(new Set(parseStringArray(saved).filter((p): p is OrderableProvider => (ORDERABLE_PROVIDERS as readonly string[]).includes(p))));
  return [...valid, ...ORDERABLE_PROVIDERS.filter((p) => !valid.includes(p))];
}

/**
 * The signed-in customer's own-key setup for THIS request, or null when it doesn't apply: anonymous visitor,
 * a plan that doesn't allow own keys, own keys switched off, or no active keys added yet — in every one of
 * those cases the platform's keys and order are used as before.
 */
export async function getOwnKeyContext(): Promise<OwnKeyContext | null> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return null;

  const config = await prisma.userModelConfig.findUnique({ where: { userId } });
  if (!config?.useOwnKeys) return null;

  const plan = await getEffectivePlan(userId);
  if (!plan?.allowsOwnKeys) return null;

  const rows = await prisma.apiKey.findMany({ where: { userId, isActive: true }, select: { provider: true, key: true } });
  const keys: Partial<Record<Provider, string[]>> = {};
  for (const row of rows) {
    if (!isProvider(row.provider)) continue;
    const plain = tryDecryptSecret(row.key);
    if (plain) (keys[row.provider] ??= []).push(plain);
  }
  if (!ORDERABLE_PROVIDERS.some((p) => keys[p]?.length)) return null;

  return {
    userId,
    keys,
    order: resolveOrder(config.order),
    openRouterModels: parseStringArray(config.openRouterModels).slice(0, MAX_OPENROUTER_MODELS),
  };
}
