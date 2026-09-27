import { isGenAITimeout } from "@/lib/genai-timeout";
import { NoApiKeysConfiguredError, isRetryableProviderError, isRequestTooLargeForProvider } from "@/lib/api-keys";
import { AllProvidersExhaustedError } from "@/lib/llm-generate";
import { HIGH_DEMAND_MESSAGE } from "@/lib/error-messages";
import { reportError } from "@/lib/error-report";

/** Maps a generation failure to a REST-appropriate { error, status } — the JSON-API counterpart
 * to the MCP server's providerErrorResult (src/app/api/mcp/route.ts), which returns isError text instead. */
export function apiErrorResponse(error: unknown, route: string, fallbackMessage: string): { error: string; status: number } {
  void reportError(error, { source: "api", route });
  if (error instanceof NoApiKeysConfiguredError) {
    return { error: "AI service is not configured. Please contact support.", status: 500 };
  }
  if (isGenAITimeout(error)) {
    return { error: "The AI is taking too long to respond. Please try again.", status: 504 };
  }
  if (isRetryableProviderError(error) || isRequestTooLargeForProvider(error) || error instanceof AllProvidersExhaustedError) {
    return { error: HIGH_DEMAND_MESSAGE, status: 503 };
  }
  return { error: fallbackMessage, status: 500 };
}
