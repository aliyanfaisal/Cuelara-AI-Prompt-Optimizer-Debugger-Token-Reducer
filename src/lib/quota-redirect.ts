"use client";

/**
 * If a tool's API response is the daily-quota-exceeded 429 (marked with code: "DAILY_LIMIT" — see the
 * various /api/tools/* routes), sends the visitor straight to /pricing with the reason so they land on
 * an upgrade path instead of just seeing an inline error and giving up. Returns true if it redirected.
 */
export function redirectIfDailyLimit(data: { code?: string; error?: string } | null | undefined): boolean {
  if (data?.code !== "DAILY_LIMIT") return false;
  const message = data.error || "You've reached your daily limit for this tool.";
  window.location.href = `/pricing?reason=quota&message=${encodeURIComponent(message)}`;
  return true;
}
