import { getDailyLimit } from "@/lib/rate-limit";
import {
  TOKEN_OPTIMIZER_DAILY_LIMIT_KEY,
  TOKEN_OPTIMIZER_DAILY_LIMIT_AUTH_KEY,
} from "@/lib/tool-settings-keys";

const DEFAULT_DAILY_LIMIT = 5;
const DEFAULT_DAILY_LIMIT_AUTH = 15;

export async function getTokenOptimizerLimit(isAuthenticated: boolean): Promise<number> {
  if (isAuthenticated) {
    return getDailyLimit(TOKEN_OPTIMIZER_DAILY_LIMIT_AUTH_KEY, DEFAULT_DAILY_LIMIT_AUTH);
  }
  return getDailyLimit(TOKEN_OPTIMIZER_DAILY_LIMIT_KEY, DEFAULT_DAILY_LIMIT);
}
