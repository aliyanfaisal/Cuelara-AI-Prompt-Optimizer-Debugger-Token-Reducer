import { NextResponse } from "next/server";
import { getRequestSubject, hasReachedDailyLimit, consumeDailyLimit, getUsedToday } from "@/lib/rate-limit";
import { isGenAITimeout } from "@/lib/genai-timeout";
import { getPromptFormatterLimit } from "@/lib/prompt-formatter/limits";
import { isFormatStyle, isIndentSize } from "@/lib/prompt-formatter/constants";
import { formatPrompt } from "@/lib/prompt-formatter/format";
import { NoApiKeysConfiguredError, isRetryableProviderError, isRequestTooLargeForProvider } from "@/lib/api-keys";
import { AllProvidersExhaustedError } from "@/lib/llm-generate";
import { HIGH_DEMAND_MESSAGE } from "@/lib/error-messages";
import { saveToolRun, titleFrom } from "@/lib/history";
import { reportError } from "@/lib/error-report";

const TOOL = "prompt-formatter";

export async function POST(req: Request) {
  try {
    const subject = await getRequestSubject(req);
    const { subjectKey, isAuthenticated } = subject;
    const limit = await getPromptFormatterLimit(subject);

    if (await hasReachedDailyLimit(subjectKey, TOOL, limit)) {
      return NextResponse.json(
        { error: `You've used your ${limit} free formats for today. Please try again tomorrow.`, code: "DAILY_LIMIT" },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const rawInput = body?.input;
    const format = body?.format;
    const indent = body?.indent;

    if (typeof rawInput !== "string" || !rawInput.trim()) {
      return NextResponse.json({ error: "Paste a prompt to format." }, { status: 400 });
    }
    if (!isFormatStyle(format)) {
      return NextResponse.json({ error: "Invalid format style." }, { status: 400 });
    }
    if (!isIndentSize(indent)) {
      return NextResponse.json({ error: "Invalid indentation size." }, { status: 400 });
    }

    const trimmedInput = rawInput.trim();

    let formatted: string | null = null;
    try {
      formatted = await formatPrompt(trimmedInput, format, indent);
    } catch (error) {
      if (error instanceof NoApiKeysConfiguredError) {
        return NextResponse.json({ error: "AI service is not configured. Please contact support." }, { status: 500 });
      }
      throw error;
    }

    if (!formatted) {
        // The model didn't return a clean, parseable result — one retry with a sharper reminder.
        const retry = await generateWithFallback(
          chain,
          `${buildFormatPrompt(trimmedInput, format)}\n\nReturn ONLY the raw formatted result. No markdown fences, no leading or trailing text.`,
          TOOL
        );
        formatted = finalizeOutput(retry.text, format, indent);
      }
    } catch (error) {
      if (error instanceof NoApiKeysConfiguredError) {
        return NextResponse.json({ error: "AI service is not configured. Please contact support." }, { status: 500 });
      }
      throw error;
    }

    if (!formatted) {
      return NextResponse.json({ error: "The AI did not return a usable result. Please try again." }, { status: 502 });
    }

    await consumeDailyLimit(subjectKey, TOOL);
    await saveToolRun({
      userId: subject.userId,
      tool: TOOL,
      title: titleFrom(rawInput),
      input: { input: rawInput.trim(), format, indent },
      result: { formatted },
      historyId: body?.historyId,
    });
    const used = await getUsedToday(subjectKey, TOOL);

    return NextResponse.json({
      formatted,
      isAuthenticated,
      promptsRemaining: Math.max(0, limit - used),
      promptsLimit: limit,
    });
  } catch (error) {
    console.error("Prompt Formatter error:", error);
    void reportError(error, { source: "api", route: "/api/tools/prompt-formatter" });
    if (isGenAITimeout(error)) {
      return NextResponse.json(
        { error: "The AI is taking too long to respond. Please try again." },
        { status: 504 }
      );
    }
    if (isRetryableProviderError(error) || isRequestTooLargeForProvider(error) || error instanceof AllProvidersExhaustedError) {
      return NextResponse.json({ error: HIGH_DEMAND_MESSAGE }, { status: 429 });
    }
    return NextResponse.json({ error: "Something went wrong while formatting your prompt." }, { status: 500 });
  }
}
