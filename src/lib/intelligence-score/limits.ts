import { getDailyLimit, resolvePlanLimit, type RequestSubject } from "@/lib/rate-limit";
import {
  INTELLIGENCE_SCORE_DAILY_LIMIT_KEY,
  INTELLIGENCE_SCORE_DAILY_LIMIT_AUTH_KEY,
} from "@/lib/tool-settings-keys";

const DEFAULT_DAILY_LIMIT = 5;
const DEFAULT_DAILY_LIMIT_AUTH = 15;

export async function getIntelligenceScoreLimit(subject: RequestSubject): Promise<number> {
  const base = subject.isAuthenticated
    ? await getDailyLimit(INTELLIGENCE_SCORE_DAILY_LIMIT_AUTH_KEY, DEFAULT_DAILY_LIMIT_AUTH)
    : await getDailyLimit(INTELLIGENCE_SCORE_DAILY_LIMIT_KEY, DEFAULT_DAILY_LIMIT);
  return resolvePlanLimit(subject, "intelligence-score", base);
}
