import { getDailyLimit } from "@/lib/rate-limit";
import {
  CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_KEY,
  CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_KEY,
  CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_AUTH_KEY,
  CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_AUTH_KEY,
} from "@/lib/tool-settings-keys";

const DEFAULT_DOCUMENT_DAILY_LIMIT = 2;
const DEFAULT_PROMPT_DAILY_LIMIT = 50;
const DEFAULT_DOCUMENT_DAILY_LIMIT_AUTH = 5;
const DEFAULT_PROMPT_DAILY_LIMIT_AUTH = 100;

export async function getContextExtractorLimits(isAuthenticated: boolean): Promise<{ documentLimit: number; promptLimit: number }> {
  if (isAuthenticated) {
    const [documentLimit, promptLimit] = await Promise.all([
      getDailyLimit(CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_AUTH_KEY, DEFAULT_DOCUMENT_DAILY_LIMIT_AUTH),
      getDailyLimit(CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_AUTH_KEY, DEFAULT_PROMPT_DAILY_LIMIT_AUTH),
    ]);
    return { documentLimit, promptLimit };
  }

  const [documentLimit, promptLimit] = await Promise.all([
    getDailyLimit(CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_KEY, DEFAULT_DOCUMENT_DAILY_LIMIT),
    getDailyLimit(CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_KEY, DEFAULT_PROMPT_DAILY_LIMIT),
  ]);
  return { documentLimit, promptLimit };
}
