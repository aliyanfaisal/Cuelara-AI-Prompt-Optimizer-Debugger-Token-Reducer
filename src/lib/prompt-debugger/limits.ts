import { getDailyLimit, resolvePlanLimit, type RequestSubject } from "@/lib/rate-limit";
import {
  PROMPT_DEBUGGER_DAILY_LIMIT_KEY,
  PROMPT_DEBUGGER_DAILY_LIMIT_AUTH_KEY,
} from "@/lib/tool-settings-keys";

const DEFAULT_DAILY_LIMIT = 5;
const DEFAULT_DAILY_LIMIT_AUTH = 15;

export async function getPromptDebuggerLimit(subject: RequestSubject): Promise<number> {
  const base = subject.isAuthenticated
    ? await getDailyLimit(PROMPT_DEBUGGER_DAILY_LIMIT_AUTH_KEY, DEFAULT_DAILY_LIMIT_AUTH)
    : await getDailyLimit(PROMPT_DEBUGGER_DAILY_LIMIT_KEY, DEFAULT_DAILY_LIMIT);
  return resolvePlanLimit(subject, "prompt-debugger", base);
}
