import "server-only";
import { prisma } from "@/lib/prisma";
import type { Provider } from "@/lib/providers";

const MAX_ERROR_MESSAGE_LENGTH = 500;

export interface LogApiCallParams {
  provider: Provider;
  model: string;
  tool: string;
  success: boolean;
  statusCode?: number;
  errorMessage?: string;
  ownKey?: boolean;
}

/**
 * Records one real outbound call to a provider key. Best-effort — a logging
 * failure must never break the tool request that triggered it.
 */
export async function logApiCall(params: LogApiCallParams): Promise<void> {
  try {
    await prisma.apiCallLog.create({
      data: {
        provider: params.provider,
        model: params.model,
        tool: params.tool,
        success: params.success,
        ownKey: params.ownKey ?? false,
        statusCode: params.statusCode ?? null,
        errorMessage: params.errorMessage ? params.errorMessage.slice(0, MAX_ERROR_MESSAGE_LENGTH) : null,
      },
    });
  } catch (error) {
    console.error("Failed to write API call log:", error);
  }
}

export function extractProviderErrorStatus(error: unknown): number | undefined {
  const status =
    (error as { status?: number })?.status ??
    (error as { statusCode?: number })?.statusCode ??
    (error as { response?: { status?: number } })?.response?.status;
  return typeof status === "number" ? status : undefined;
}

export function extractProviderErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
