import { getDailyLimit } from "@/lib/rate-limit";
import {
  SITE_TO_PROMPT_EXTRACT_DAILY_LIMIT_KEY,
  SITE_TO_PROMPT_EXTRACT_DAILY_LIMIT_AUTH_KEY,
  SITE_TO_PROMPT_DAILY_LIMIT_KEY,
  SITE_TO_PROMPT_DAILY_LIMIT_AUTH_KEY,
} from "@/lib/tool-settings-keys";

export async function getSiteToPromptLimits(isAuthenticated: boolean): Promise<{ extractLimit: number; promptLimit: number }> {
  const [extractLimit, promptLimit] = isAuthenticated
    ? await Promise.all([
        getDailyLimit(SITE_TO_PROMPT_EXTRACT_DAILY_LIMIT_AUTH_KEY, 10),
        getDailyLimit(SITE_TO_PROMPT_DAILY_LIMIT_AUTH_KEY, 20),
      ])
    : await Promise.all([
        getDailyLimit(SITE_TO_PROMPT_EXTRACT_DAILY_LIMIT_KEY, 3),
        getDailyLimit(SITE_TO_PROMPT_DAILY_LIMIT_KEY, 6),
      ]);
  return { extractLimit, promptLimit };
}
