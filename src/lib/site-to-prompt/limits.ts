import { getDailyLimit, resolvePlanLimit, type RequestSubject } from "@/lib/rate-limit";
import {
  SITE_TO_PROMPT_EXTRACT_DAILY_LIMIT_KEY,
  SITE_TO_PROMPT_EXTRACT_DAILY_LIMIT_AUTH_KEY,
  SITE_TO_PROMPT_DAILY_LIMIT_KEY,
  SITE_TO_PROMPT_DAILY_LIMIT_AUTH_KEY,
} from "@/lib/tool-settings-keys";

// "site-to-prompt" (the plan-limit tool id, see src/lib/plan-tools.ts) covers the
// generate-prompt step; the analyse/extract step has no separate plan override.
export async function getSiteToPromptLimits(subject: RequestSubject): Promise<{ extractLimit: number; promptLimit: number }> {
  const [extractLimit, promptLimit] = subject.isAuthenticated
    ? await Promise.all([
        getDailyLimit(SITE_TO_PROMPT_EXTRACT_DAILY_LIMIT_AUTH_KEY, 10),
        getDailyLimit(SITE_TO_PROMPT_DAILY_LIMIT_AUTH_KEY, 20),
      ])
    : await Promise.all([
        getDailyLimit(SITE_TO_PROMPT_EXTRACT_DAILY_LIMIT_KEY, 3),
        getDailyLimit(SITE_TO_PROMPT_DAILY_LIMIT_KEY, 6),
      ]);
  return { extractLimit, promptLimit: await resolvePlanLimit(subject, "site-to-prompt", promptLimit) };
}
