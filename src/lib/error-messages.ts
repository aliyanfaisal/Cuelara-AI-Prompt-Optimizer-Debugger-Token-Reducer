/**
 * Shown for a 429 on any AI-backed tool: every free-tier provider in that tool's fallback
 * chain either rate-limited, overloaded, or rejected the request as too large. Named for what
 * actually happened (traffic/capacity), not a generic failure, so users don't mistake it for
 * a bug and know retrying shortly is the right move.
 */
export const HIGH_DEMAND_MESSAGE = "Our free AI models are experiencing heavy demand right now. Please wait a minute and try again.";
