import { getDailyLimit } from "@/lib/rate-limit";
import {
  INTELLIGENCE_SCORE_DAILY_LIMIT_KEY,
  INTELLIGENCE_SCORE_DAILY_LIMIT_AUTH_KEY,
} from "@/lib/tool-settings-keys";

const DEFAULT_DAILY_LIMIT = 5;
const DEFAULT_DAILY_LIMIT_AUTH = 15;

export async function getIntelligenceScoreLimit(isAuthenticated: boolean): Promise<number> {
  if (isAuthenticated) {
    return getDailyLimit(INTELLIGENCE_SCORE_DAILY_LIMIT_AUTH_KEY, DEFAULT_DAILY_LIMIT_AUTH);
  }
  return getDailyLimit(INTELLIGENCE_SCORE_DAILY_LIMIT_KEY, DEFAULT_DAILY_LIMIT);
}
