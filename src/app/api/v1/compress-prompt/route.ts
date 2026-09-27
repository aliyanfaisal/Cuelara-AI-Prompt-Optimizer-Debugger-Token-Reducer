import { z } from "zod";
import { hasReachedDailyLimit, consumeDailyLimit } from "@/lib/rate-limit";
import { resolveCaller } from "@/lib/api-caller";
import { corsJson, handleCorsPreflight } from "@/lib/api-cors";
import { apiErrorResponse } from "@/lib/api-error";
import { getTokenOptimizerLimit } from "@/lib/token-optimizer/limits";
import { COMPRESSION_LEVELS, PRESERVE_OPTIONS, isCompressionLevel, isPreserveOption } from "@/lib/token-optimizer/constants";
import { compressPrompt } from "@/lib/token-optimizer/compress";

export const runtime = "nodejs";

const ROUTE = "/api/v1/compress-prompt";

const bodySchema = z.object({
  text: z.string().min(1, "text must not be empty"),
  level: z.enum(COMPRESSION_LEVELS).optional(),
  preserveFormatting: z.enum(PRESERVE_OPTIONS).optional(),
});

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(req: Request) {
  const rawBody = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return corsJson({ error: parsed.error.issues[0]?.message ?? "Invalid request body." }, { status: 400 });
  }
  const { text, level, preserveFormatting } = parsed.data;
  const resolvedLevel = isCompressionLevel(level) ? level : COMPRESSION_LEVELS[1];
  const resolvedPreserve = isPreserveOption(preserveFormatting) ? preserveFormatting : "Yes";

  const caller = await resolveCaller(req);
  if ("error" in caller) return corsJson({ error: caller.error }, { status: 401 });
  const { subject, isFreeCaller } = caller;

  const limit = await getTokenOptimizerLimit(subject);
  if (await hasReachedDailyLimit(subject.subjectKey, "token-optimizer", limit)) {
    return corsJson(
      { error: `Daily compression limit reached (${limit}/day for this caller). Try again tomorrow, or sign in at cuelara.com for a higher limit.` },
      { status: 429 }
    );
  }

  try {
    const { compressed, originalTokens, compressedTokens } = await compressPrompt(text, resolvedLevel, resolvedPreserve);
    await consumeDailyLimit(subject.subjectKey, "token-optimizer");
    const savedPercent = originalTokens > 0 ? Math.max(0, Math.round((1 - compressedTokens / originalTokens) * 100)) : 0;
    return corsJson({
      compressed: isFreeCaller ? `${compressed}\n\n— Compressed by Cuelara.com` : compressed,
      originalTokens,
      compressedTokens,
      savedPercent,
    });
  } catch (error) {
    const { error: message, status } = apiErrorResponse(error, ROUTE, "Something went wrong while compressing the prompt.");
    return corsJson({ error: message }, { status });
  }
}
