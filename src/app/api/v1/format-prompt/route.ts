import { z } from "zod";
import { hasReachedDailyLimit, consumeDailyLimit } from "@/lib/rate-limit";
import { resolveCaller } from "@/lib/api-caller";
import { corsJson, handleCorsPreflight } from "@/lib/api-cors";
import { apiErrorResponse } from "@/lib/api-error";
import { getPromptFormatterLimit } from "@/lib/prompt-formatter/limits";
import { FORMAT_STYLES, INDENT_SIZES, isFormatStyle, isIndentSize } from "@/lib/prompt-formatter/constants";
import { formatPrompt } from "@/lib/prompt-formatter/format";

export const runtime = "nodejs";

const ROUTE = "/api/v1/format-prompt";
const MAX_TEXT_CHARS = 20000;

const bodySchema = z.object({
  text: z.string().min(1, "text must not be empty").max(MAX_TEXT_CHARS, `text must be at most ${MAX_TEXT_CHARS} characters`),
  format: z.enum(FORMAT_STYLES).optional(),
  indent: z.enum(INDENT_SIZES).optional(),
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
  const { text, format, indent } = parsed.data;
  const resolvedFormat = isFormatStyle(format) ? format : FORMAT_STYLES[0];
  const resolvedIndent = isIndentSize(indent) ? indent : INDENT_SIZES[0];

  const caller = await resolveCaller(req);
  if ("error" in caller) return corsJson({ error: caller.error }, { status: 401 });
  const { subject } = caller;

  const limit = await getPromptFormatterLimit(subject);
  if (await hasReachedDailyLimit(subject.subjectKey, "prompt-formatter", limit)) {
    return corsJson(
      { error: `Daily format limit reached (${limit}/day for this caller). Try again tomorrow, or sign in at cuelara.com for a higher limit.` },
      { status: 429 }
    );
  }

  try {
    const formatted = await formatPrompt(text, resolvedFormat, resolvedIndent);
    if (!formatted) {
      return corsJson({ error: "The AI did not return a usable result. Please try again." }, { status: 502 });
    }
    await consumeDailyLimit(subject.subjectKey, "prompt-formatter");
    return corsJson({ formatted });
  } catch (error) {
    const { error: message, status } = apiErrorResponse(error, ROUTE, "Something went wrong while formatting the prompt.");
    return corsJson({ error: message }, { status });
  }
}
