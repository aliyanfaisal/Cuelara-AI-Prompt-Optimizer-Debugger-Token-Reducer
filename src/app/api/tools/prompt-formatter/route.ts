import { NextResponse } from "next/server";
import { getRequestSubject, hasReachedDailyLimit, consumeDailyLimit, getUsedToday } from "@/lib/rate-limit";
import { isGenAITimeout } from "@/lib/genai-timeout";
import { getPromptFormatterLimit } from "@/lib/prompt-formatter/limits";
import {
  isFormatStyle,
  isIndentSize,
  FORMAT_GUIDANCE,
  indentToSpaces,
  type FormatStyle,
  type IndentSize,
} from "@/lib/prompt-formatter/constants";
import { NoApiKeysConfiguredError, isRetryableProviderError } from "@/lib/api-keys";
import { generateWithFallback } from "@/lib/llm-generate";
import { buildTextGenerationChain } from "@/lib/model-chain";

const TOOL = "prompt-formatter";

function buildFormatPrompt(rawInput: string, format: FormatStyle): string {
  return `You are an expert prompt engineer. Reorganize the messy, unstructured prompt below into clean semantic sections — a system role, the primary task, explicit constraints, and the expected output format.

Use ONLY the user's actual content: preserve every real instruction, requirement, and detail from the input. Do not invent new requirements, do not add filler, and do not drop anything the user actually asked for. Where the input doesn't state a section explicitly (e.g. no system role given), infer a minimal, sensible one directly from the context of the task — never a generic placeholder unrelated to the input.

RAW PROMPT:
"""
${rawInput}
"""

OUTPUT FORMAT: ${FORMAT_GUIDANCE[format]}

Return ONLY the formatted result — no markdown code fences around it, no explanation, no commentary before or after.`;
}

function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:\w+)?\s*([\s\S]*?)```$/);
  return (fenced ? fenced[1] : trimmed).trim();
}

function extractJsonObject(text: string): string {
  const stripped = stripFences(text);
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return stripped;
  return stripped.slice(start, end + 1);
}

function finalizeOutput(rawText: string, format: FormatStyle, indent: IndentSize): string | null {
  const text = rawText.trim();
  if (!text) return null;

  if (format === "JSON (API Ready)") {
    try {
      const parsed = JSON.parse(extractJsonObject(text));
      return JSON.stringify(parsed, null, indentToSpaces(indent));
    } catch {
      return null;
    }
  }

  return stripFences(text);
}

export async function POST(req: Request) {
  try {
    const { subjectKey, isAuthenticated } = await getRequestSubject(req);
    const limit = await getPromptFormatterLimit(isAuthenticated);

    if (await hasReachedDailyLimit(subjectKey, TOOL, limit)) {
      return NextResponse.json(
        { error: `You've used your ${limit} free formats for today. Please try again tomorrow.` },
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
      const chain = await buildTextGenerationChain();
      const attempt = await generateWithFallback(chain, buildFormatPrompt(trimmedInput, format), TOOL);
      formatted = finalizeOutput(attempt.text, format, indent);

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
    const used = await getUsedToday(subjectKey, TOOL);

    return NextResponse.json({
      formatted,
      isAuthenticated,
      promptsRemaining: Math.max(0, limit - used),
      promptsLimit: limit,
    });
  } catch (error) {
    console.error("Prompt Formatter error:", error);
    if (isGenAITimeout(error)) {
      return NextResponse.json(
        { error: "The AI is taking too long to respond. Please try again." },
        { status: 504 }
      );
    }
    if (isRetryableProviderError(error)) {
      return NextResponse.json(
        { error: "All configured API keys are currently rate-limited. Please try again shortly." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "Something went wrong while formatting your prompt." }, { status: 500 });
  }
}
