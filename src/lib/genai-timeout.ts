// Without an explicit timeout, an @google/genai call has no upper bound — a slow
// upstream response hangs the request (and, on Vercel, burns the function's wall clock)
// instead of failing fast into a fallback.
export const GENAI_TIMEOUT_MS = 60_000;

export function isGenAITimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}
