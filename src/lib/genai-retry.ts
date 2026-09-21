import "server-only";
import { extractProviderErrorStatus } from "@/lib/api-call-log";

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

// Gemini's 503 "high demand" spikes are short-lived, so a couple of backed-off retries usually clear them.
export async function withGenAIRetry<T>(fn: () => Promise<T>, attempts = 4, baseDelayMs = 1500): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = extractProviderErrorStatus(error);
      if (typeof status !== "number" || !RETRYABLE_STATUSES.has(status) || i === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** i));
    }
  }
  throw lastError;
}
