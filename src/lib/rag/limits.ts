import { getDailyLimit, resolvePlanLimit, type RequestSubject } from "@/lib/rate-limit";
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

export async function getContextExtractorLimits(subject: RequestSubject): Promise<{ documentLimit: number; promptLimit: number }> {
  const [documentLimit, promptLimit] = subject.isAuthenticated
    ? await Promise.all([
        getDailyLimit(CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_AUTH_KEY, DEFAULT_DOCUMENT_DAILY_LIMIT_AUTH),
        getDailyLimit(CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_AUTH_KEY, DEFAULT_PROMPT_DAILY_LIMIT_AUTH),
      ])
    : await Promise.all([
        getDailyLimit(CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_KEY, DEFAULT_DOCUMENT_DAILY_LIMIT),
        getDailyLimit(CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_KEY, DEFAULT_PROMPT_DAILY_LIMIT),
      ]);
  return {
    documentLimit: resolvePlanLimit(subject, "context-extractor-document", documentLimit),
    promptLimit: resolvePlanLimit(subject, "context-extractor-prompt", promptLimit),
  };
}
