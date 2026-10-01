import { NextResponse } from "next/server";
import { getRequestSubject, hasReachedDailyLimit, consumeDailyLimit, getUsedToday } from "@/lib/rate-limit";
import { isGenAITimeout } from "@/lib/genai-timeout";
import { getPromptDebuggerLimit } from "@/lib/prompt-debugger/limits";
import { isStrictnessLevel, isFocusArea, type DebuggerReport } from "@/lib/prompt-debugger/constants";
import { auditPrompt } from "@/lib/prompt-debugger/audit";
import { NoApiKeysConfiguredError, isRetryableProviderError, isRequestTooLargeForProvider } from "@/lib/api-keys";
import { AllProvidersExhaustedError } from "@/lib/llm-generate";
import { HIGH_DEMAND_MESSAGE } from "@/lib/error-messages";
import { saveToolRun, titleFrom } from "@/lib/history";
import { reportError } from "@/lib/error-report";

const TOOL = "prompt-debugger";

export async function POST(req: Request) {
  try {
    const subject = await getRequestSubject(req);
    const { subjectKey, isAuthenticated } = subject;
    const limit = await getPromptDebuggerLimit(subject);

    if (await hasReachedDailyLimit(subjectKey, TOOL, limit)) {
      return NextResponse.json(
        { error: `You've used your ${limit} free audits for today. Please try again tomorrow.`, code: "DAILY_LIMIT" },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const rawInput = body?.input;
    const level = body?.level;
    const focus = body?.focus;

    if (typeof rawInput !== "string" || !rawInput.trim()) {
      return NextResponse.json({ error: "Paste a prompt to audit." }, { status: 400 });
    }
    if (!isStrictnessLevel(level)) {
      return NextResponse.json({ error: "Invalid strictness level." }, { status: 400 });
    }
    if (!isFocusArea(focus)) {
      return NextResponse.json({ error: "Invalid focus area." }, { status: 400 });
    }

    const trimmedInput = rawInput.trim();

    let report: DebuggerReport | null = null;
    try {
      report = await auditPrompt(trimmedInput, level, focus);
    } catch (error) {
      if (error instanceof NoApiKeysConfiguredError) {
        return NextResponse.json({ error: "AI service is not configured. Please contact support." }, { status: 500 });
      }
      throw error;
    }

    if (!report) {
        // The model didn't return clean JSON — one retry with a sharper reminder.
        const retry = await generateWithFallback(
          chain,
          `${buildAuditPrompt(trimmedInput, level, focus)}\n\nReturn ONLY the raw JSON object. No markdown fences, no leading or trailing text.`,
          TOOL
        );
        report = parseReport(retry.text);
      }
    } catch (error) {
      if (error instanceof NoApiKeysConfiguredError) {
        return NextResponse.json({ error: "AI service is not configured. Please contact support." }, { status: 500 });
      }
      throw error;
    }

    if (!report) {
      return NextResponse.json({ error: "The AI did not return a usable result. Please try again." }, { status: 502 });
    }

    await consumeDailyLimit(subjectKey, TOOL);
    await saveToolRun({
      userId: subject.userId,
      tool: TOOL,
      title: titleFrom(rawInput),
      input: { input: rawInput.trim(), level, focus },
      result: { issues: report.issues, passedChecks: report.passedChecks },
      historyId: body?.historyId,
    });
    const used = await getUsedToday(subjectKey, TOOL);

    return NextResponse.json({
      issues: report.issues,
      passedChecks: report.passedChecks,
      isAuthenticated,
      promptsRemaining: Math.max(0, limit - used),
      promptsLimit: limit,
    });
  } catch (error) {
    console.error("Prompt Debugger error:", error);
    void reportError(error, { source: "api", route: "/api/tools/prompt-debugger" });
    if (isGenAITimeout(error)) {
      return NextResponse.json(
        { error: "The AI is taking too long to respond. Please try again." },
        { status: 504 }
      );
    }
    if (isRetryableProviderError(error) || isRequestTooLargeForProvider(error) || error instanceof AllProvidersExhaustedError) {
      return NextResponse.json({ error: HIGH_DEMAND_MESSAGE }, { status: 429 });
    }
    return NextResponse.json({ error: "Something went wrong while auditing your prompt." }, { status: 500 });
  }
}
