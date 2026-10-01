import { z } from "zod";
import { hasReachedDailyLimit, consumeDailyLimit } from "@/lib/rate-limit";
import { resolveCaller } from "@/lib/api-caller";
import { corsJson, handleCorsPreflight } from "@/lib/api-cors";
import { apiErrorResponse } from "@/lib/api-error";
import { getPromptDebuggerLimit } from "@/lib/prompt-debugger/limits";
import { STRICTNESS_LEVELS, FOCUS_AREAS, isStrictnessLevel, isFocusArea } from "@/lib/prompt-debugger/constants";
import { auditPrompt, applyFixes } from "@/lib/prompt-debugger/audit";

export const runtime = "nodejs";

const ROUTE = "/api/v1/debug-prompt";
const MAX_TEXT_CHARS = 20000;

const bodySchema = z.object({
  text: z.string().min(1, "text must not be empty").max(MAX_TEXT_CHARS, `text must be at most ${MAX_TEXT_CHARS} characters`),
  level: z.enum(STRICTNESS_LEVELS).optional(),
  focus: z.enum(FOCUS_AREAS).optional(),
  // Also rewrite the prompt with every suggested fix applied. Counts as a single use, not two.
  applyFixes: z.boolean().optional(),
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
  const { text, level, focus, applyFixes: shouldApply } = parsed.data;
  const resolvedLevel = isStrictnessLevel(level) ? level : STRICTNESS_LEVELS[0];
  const resolvedFocus = isFocusArea(focus) ? focus : FOCUS_AREAS[0];

  const caller = await resolveCaller(req);
  if ("error" in caller) return corsJson({ error: caller.error }, { status: 401 });
  const { subject } = caller;

  const limit = await getPromptDebuggerLimit(subject);
  if (await hasReachedDailyLimit(subject.subjectKey, "prompt-debugger", limit)) {
    return corsJson(
      { error: `Daily audit limit reached (${limit}/day for this caller). Try again tomorrow, or sign in at cuelara.com for a higher limit.` },
      { status: 429 }
    );
  }

  try {
    const report = await auditPrompt(text, resolvedLevel, resolvedFocus);
    if (!report) {
      return corsJson({ error: "The AI did not return a usable result. Please try again." }, { status: 502 });
    }
    // Nothing to fix means the prompt is already clean, so it comes back unchanged.
    const fixed = shouldApply ? (report.issues.length > 0 ? await applyFixes(text, report.issues.map((i) => i.fix)) : text.trim()) : undefined;
    if (shouldApply && !fixed) {
      return corsJson({ error: "The AI did not return a usable result. Please try again." }, { status: 502 });
    }
    await consumeDailyLimit(subject.subjectKey, "prompt-debugger");
    return corsJson({ issues: report.issues, passedChecks: report.passedChecks, ...(fixed !== undefined && { fixed }) });
  } catch (error) {
    const { error: message, status } = apiErrorResponse(error, ROUTE, "Something went wrong while auditing the prompt.");
    return corsJson({ error: message }, { status });
  }
}
