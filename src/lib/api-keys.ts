import "server-only";
import { prisma } from "@/lib/prisma";
import { PROVIDER_LABELS, type Provider } from "@/lib/providers";

export { PROVIDERS, PROVIDER_LABELS, isProvider, type Provider } from "@/lib/providers";

export async function getActiveApiKeys(provider: Provider): Promise<string[]> {
  const rows = await prisma.apiKey.findMany({
    where: { provider, isActive: true },
    select: { key: true },
  });
  return rows.map((r) => r.key);
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * A key-specific failure (rate limit, quota, invalid/expired credential, or the
 * provider's own server erroring) — worth retrying with a different key from the
 * pool. Anything else (bad input, safety block, empty response) fails the same
 * way regardless of which key sent it, so it isn't retried across the pool.
 */
export function isRetryableProviderError(error: unknown): boolean {
  const status =
    (error as { status?: number })?.status ??
    (error as { statusCode?: number })?.statusCode ??
    (error as { response?: { status?: number } })?.response?.status;
  if (typeof status === "number") {
    return status === 401 || status === 403 || status === 429 || status >= 500;
  }
  return false;
}

export class NoApiKeysConfiguredError extends Error {
  constructor(provider: Provider) {
    super(`No active API keys configured for ${PROVIDER_LABELS[provider]}.`);
    this.name = "NoApiKeysConfiguredError";
  }
}

/**
 * Runs `fn` with a randomly-chosen key from the provider's active pool. On a
 * retryable failure (see isRetryableProviderError), tries again with a different
 * key from the pool until one succeeds or the pool is exhausted.
 */
export async function callWithKeyRotation<T>(
  provider: Provider,
  fn: (apiKey: string) => Promise<T>
): Promise<T> {
  const keys = shuffle(await getActiveApiKeys(provider));
  if (keys.length === 0) throw new NoApiKeysConfiguredError(provider);

  let lastError: unknown;
  for (const key of keys) {
    try {
      return await fn(key);
    } catch (error) {
      lastError = error;
      if (!isRetryableProviderError(error)) throw error;
    }
  }
  throw lastError;
}
