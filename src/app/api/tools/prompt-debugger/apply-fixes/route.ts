import { NextResponse } from "next/server";
import { getRequestSubject, hasReachedDailyLimit, consumeDailyLimit, getUsedToday } from "@/lib/rate-limit";
import { isGenAITimeout } from "@/lib/genai-timeout";
import { getPromptDebuggerLimit } from "@/lib/prompt-debugger/limits";
import { NoApiKeysConfiguredError, isRetryableProviderError, isRequestTooLargeForProvider } from "@/lib/api-keys";
import { generateWithFallback, AllProvidersExhaustedError } from "@/lib/llm-generate";
import { buildTextGenerationChain } from "@/lib/model-chain";
import { HIGH_DEMAND_MESSAGE } from "@/lib/error-messages";
import { reportError } from "@/lib/error-report";

const TOOL = "prompt-debugger";

function buildRewritePrompt(rawInput: string, fixes: string[]): string {
  return `You are an expert prompt engineer. Rewrite the prompt below into one clean, coherent, production-ready prompt that fully incorporates every fix listed.

Do NOT just bolt the fixes on as a list of separate sentences at the end — integrate each one naturally into the prompt's existing structure and wording. Merge overlapping or related fixes into a single clause instead of repeating yourself, remove anything that becomes redundant once a fix is applied, and keep the result reading like one prompt a person would actually write, not a patchwork.

ORIGINAL PROMPT:
"""
${rawInput}
"""

FIXES TO INCORPORATE:
${fixes.map((fix) => `- ${fix}`).join("\n")}

Return only the rewritten prompt text — no meta-commentary, no explanation of what changed, no markdown fences.`;
}

export async function POST(req: Request) {
  try {
    const subject = await getRequestSubject(req);
    const { subjectKey, isAuthenticated } = subject;
    const limit = await getPromptDebuggerLimit(subject);

    if (await hasReachedDailyLimit(subjectKey, TOOL, limit)) {
      return NextResponse.json(
        { error: `You've used your ${limit} free audits for today. Please try again tomorrow.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const rawInput = body?.input;
    const fixes = body?.fixes;

    if (typeof rawInput !== "string" || !rawInput.trim()) {
      return NextResponse.json({ error: "Paste a prompt to fix." }, { status: 400 });
    }
    if (!Array.isArray(fixes) || fixes.length === 0 || !fixes.every((f) => typeof f === "string" && f.trim())) {
      return NextResponse.json({ error: "No fixes to apply." }, { status: 400 });
    }

    let rewritten: string;
    try {
      const chain = await buildTextGenerationChain();
      const attempt = await generateWithFallback(chain, buildRewritePrompt(rawInput.trim(), fixes), TOOL);
      rewritten = attempt.text.trim();
    } catch (error) {
      if (error instanceof NoApiKeysConfiguredError) {
        return NextResponse.json({ error: "AI service is not configured. Please contact support." }, { status: 500 });
      }
      throw error;
    }

    if (!rewritten) {
      return NextResponse.json({ error: "The AI did not return a usable result. Please try again." }, { status: 502 });
    }

    await consumeDailyLimit(subjectKey, TOOL);
    const used = await getUsedToday(subjectKey, TOOL);

    return NextResponse.json({
      rewritten,
      isAuthenticated,
      promptsRemaining: Math.max(0, limit - used),
      promptsLimit: limit,
    });
  } catch (error) {
    console.error("Prompt Debugger apply-fixes error:", error);
    void reportError(error, { source: "api", route: "/api/tools/prompt-debugger/apply-fixes" });
    if (isGenAITimeout(error)) {
      return NextResponse.json(
        { error: "The AI is taking too long to respond. Please try again." },
        { status: 504 }
      );
    }
    if (isRetryableProviderError(error) || isRequestTooLargeForProvider(error) || error instanceof AllProvidersExhaustedError) {
      return NextResponse.json({ error: HIGH_DEMAND_MESSAGE }, { status: 429 });
    }
    return NextResponse.json({ error: "Something went wrong while applying fixes." }, { status: 500 });
  }
}
