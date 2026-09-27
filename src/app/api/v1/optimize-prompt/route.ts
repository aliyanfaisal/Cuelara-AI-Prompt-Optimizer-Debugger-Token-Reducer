import { z } from "zod";
import { hasReachedDailyLimit, consumeDailyLimit } from "@/lib/rate-limit";
import { resolveCaller } from "@/lib/api-caller";
import { corsJson, handleCorsPreflight } from "@/lib/api-cors";
import { apiErrorResponse } from "@/lib/api-error";
import { getPromptOptimizerLimit } from "@/lib/prompt-optimizer/limits";
import { MODES, LEVELS, isOptimizerMode, isOptimizerLevel } from "@/lib/prompt-optimizer/constants";
import { optimizePrompt } from "@/lib/prompt-optimizer/optimize";

export const runtime = "nodejs";

const ROUTE = "/api/v1/optimize-prompt";

const bodySchema = z.object({
  text: z.string().min(1, "text must not be empty"),
  mode: z.enum(MODES).optional(),
  level: z.enum(LEVELS).optional(),
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
  const { text, mode, level } = parsed.data;
  const resolvedMode = isOptimizerMode(mode) ? mode : MODES[0];
  const resolvedLevel = isOptimizerLevel(level) ? level : LEVELS[1];

  const caller = await resolveCaller(req);
  if ("error" in caller) return corsJson({ error: caller.error }, { status: 401 });
  const { subject, isFreeCaller } = caller;

  const limit = await getPromptOptimizerLimit(subject);
  if (await hasReachedDailyLimit(subject.subjectKey, "prompt-optimizer", limit)) {
    return corsJson(
      { error: `Daily optimization limit reached (${limit}/day for this caller). Try again tomorrow, or sign in at cuelara.com for a higher limit.` },
      { status: 429 }
    );
  }

  try {
    const optimized = await optimizePrompt(text, resolvedMode, resolvedLevel);
    if (!optimized) {
      return corsJson({ error: "The AI did not return a result. Please try again." }, { status: 502 });
    }
    await consumeDailyLimit(subject.subjectKey, "prompt-optimizer");
    return corsJson({ optimized: isFreeCaller ? `${optimized}\n\n— Optimized by Cuelara.com` : optimized });
  } catch (error) {
    const { error: message, status } = apiErrorResponse(error, ROUTE, "Something went wrong while optimizing the prompt.");
    return corsJson({ error: message }, { status });
  }
}
