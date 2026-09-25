import "server-only";
import { prisma } from "@/lib/prisma";
import { PROVIDER_LABELS, type Provider } from "@/lib/providers";
import { tryDecryptSecret } from "@/lib/secret-box";
import { getOwnKeyContext } from "@/lib/user-keys";
import { logApiCall, extractProviderErrorStatus, extractProviderErrorMessage } from "@/lib/api-call-log";

export { PROVIDERS, PROVIDER_LABELS, isProvider, type Provider } from "@/lib/providers";

/** Platform keys (managed in admin) unless a customer's `userId` is given — then that customer's own keys. */
export async function getActiveApiKeys(provider: Provider, userId: string | null = null): Promise<string[]> {
  const rows = await prisma.apiKey.findMany({
    where: { provider, isActive: true, userId },
    select: { key: true },
  });
  return rows.map((r) => tryDecryptSecret(r.key)).filter((k): k is string => k !== null);
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
  const status = extractProviderErrorStatus(error);
  if (typeof status === "number") {
    return status === 401 || status === 403 || status === 429 || status >= 500;
  }
  return false;
}

/**
 * The provider rejected this request as too big for its plan (HTTP 413, e.g. a free tier's tokens-per-minute cap).
 * Another provider may well accept it, so a fallback chain should move on rather than fail the whole request.
 */
export function isRequestTooLargeForProvider(error: unknown): boolean {
  return extractProviderErrorStatus(error) === 413;
}

export class NoApiKeysConfiguredError extends Error {
  constructor(provider: Provider) {
    super(`No active API keys configured for ${PROVIDER_LABELS[provider]}.`);
    this.name = "NoApiKeysConfiguredError";
  }
}

export interface CallMeta {
  /** Which tool triggered this call — powers the admin usage dashboard's breakdown. */
  tool: string;
  /** The specific model requested — logged alongside the provider for per-model stats. */
  model: string;
}

/**
 * Runs `fn` with a randomly-chosen key from the provider's active pool. On a
 * retryable failure (see isRetryableProviderError), tries again with a different
 * key from the pool until one succeeds or the pool is exhausted. Every real
 * attempt (one per key tried) is logged for the admin dashboard, success or fail.
 */
export async function callWithKeyRotation<T>(
  provider: Provider,
  fn: (apiKey: string) => Promise<T>,
  meta: CallMeta
): Promise<T> {
  // A customer on the bring-your-own-keys plan uses their own keys for this provider when they have any,
  // and the platform pool otherwise (e.g. the Context Extractor's Gemini embeddings).
  const own = await getOwnKeyContext();
  const ownKeys = own?.keys[provider] ?? [];
  const isOwnKey = ownKeys.length > 0;
  const keys = shuffle(isOwnKey ? ownKeys : await getActiveApiKeys(provider));
  if (keys.length === 0) throw new NoApiKeysConfiguredError(provider);

  let lastError: unknown;
  for (const key of keys) {
    try {
      const result = await fn(key);
      await logApiCall({ provider, model: meta.model, tool: meta.tool, success: true, ownKey: isOwnKey });
      return result;
    } catch (error) {
      lastError = error;
      await logApiCall({
        provider,
        model: meta.model,
        tool: meta.tool,
        success: false,
        ownKey: isOwnKey,
        statusCode: extractProviderErrorStatus(error),
        errorMessage: extractProviderErrorMessage(error),
      });
      if (!isRetryableProviderError(error)) throw error;
    }
  }
  throw lastError;
}
