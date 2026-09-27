import { z } from "zod";
import { hasReachedDailyLimit, consumeDailyLimit } from "@/lib/rate-limit";
import { resolveCaller } from "@/lib/api-caller";
import { corsJson, handleCorsPreflight } from "@/lib/api-cors";
import { apiErrorResponse } from "@/lib/api-error";
import { getPromptBuilderLimit } from "@/lib/prompt-builder/limits";
import { BUILDER_TARGETS, BUILDER_USE_CASES, BUILDER_DETAIL_LEVELS, MAX_IDEA_CHARS, isBuilderTarget, isBuilderUseCase, isBuilderDetail } from "@/lib/prompt-builder/constants";
import { buildPrompt } from "@/lib/prompt-builder/build";

export const runtime = "nodejs";

const ROUTE = "/api/v1/build-prompt";

const bodySchema = z.object({
  idea: z.string().min(1, "idea must not be empty").max(MAX_IDEA_CHARS, `idea must be at most ${MAX_IDEA_CHARS} characters`),
  target: z.enum(BUILDER_TARGETS).optional(),
  useCase: z.enum(BUILDER_USE_CASES).optional(),
  detail: z.enum(BUILDER_DETAIL_LEVELS).optional(),
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
  const { idea, target, useCase, detail } = parsed.data;
  const resolvedTarget = isBuilderTarget(target) ? target : BUILDER_TARGETS[0];
  const resolvedUseCase = isBuilderUseCase(useCase) ? useCase : BUILDER_USE_CASES[0];
  const resolvedDetail = isBuilderDetail(detail) ? detail : BUILDER_DETAIL_LEVELS[1];

  const caller = await resolveCaller(req);
  if ("error" in caller) return corsJson({ error: caller.error }, { status: 401 });
  const { subject, isFreeCaller } = caller;

  const limit = await getPromptBuilderLimit(subject);
  if (await hasReachedDailyLimit(subject.subjectKey, "prompt-builder", limit)) {
    return corsJson(
      { error: `Daily build limit reached (${limit}/day for this caller). Try again tomorrow, or sign in at cuelara.com for a higher limit.` },
      { status: 429 }
    );
  }

  try {
    const built = await buildPrompt(idea, resolvedTarget, resolvedUseCase, resolvedDetail);
    if (!built) {
      return corsJson({ error: "The AI did not return a usable result. Please try again." }, { status: 502 });
    }
    await consumeDailyLimit(subject.subjectKey, "prompt-builder");
    return corsJson({ prompt: isFreeCaller ? `${built}\n\n— Built by Cuelara.com` : built });
  } catch (error) {
    const { error: message, status } = apiErrorResponse(error, ROUTE, "Something went wrong while building the prompt.");
    return corsJson({ error: message }, { status });
  }
}
