import { NextResponse } from "next/server";
import { getRequestSubject, hasReachedDailyLimit, consumeDailyLimit, getUsedToday } from "@/lib/rate-limit";
import { isGenAITimeout } from "@/lib/genai-timeout";
import { getTokenOptimizerLimit } from "@/lib/token-optimizer/limits";
import { isCompressionLevel, isPreserveOption } from "@/lib/token-optimizer/constants";
import { compressPrompt } from "@/lib/token-optimizer/compress";
import { encodeStreamMeta, encodeStreamError } from "@/lib/stream-protocol";
import { NoApiKeysConfiguredError, isRetryableProviderError, isRequestTooLargeForProvider } from "@/lib/api-keys";
import { AllProvidersExhaustedError } from "@/lib/llm-generate";
import { HIGH_DEMAND_MESSAGE } from "@/lib/error-messages";
import { saveToolRun, titleFrom } from "@/lib/history";
import { reportError } from "@/lib/error-report";

const TOOL = "token-optimizer";

export async function POST(req: Request) {
  try {
    const subject = await getRequestSubject(req);
    const { subjectKey, isAuthenticated } = subject;
    const limit = await getTokenOptimizerLimit(subject);

    if (await hasReachedDailyLimit(subjectKey, TOOL, limit)) {
      return NextResponse.json(
        { error: `You've used your ${limit} free compressions for today. Please try again tomorrow.`, code: "DAILY_LIMIT" },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const rawInput = body?.input;
    const level = body?.level;
    const preserveFormatting = body?.preserveFormatting;

    if (typeof rawInput !== "string" || !rawInput.trim()) {
      return NextResponse.json({ error: "Paste a prompt to compress." }, { status: 400 });
    }
    if (!isCompressionLevel(level)) {
      return NextResponse.json({ error: "Invalid compression level." }, { status: 400 });
    }
    if (!isPreserveOption(preserveFormatting)) {
      return NextResponse.json({ error: "Invalid formatting preference." }, { status: 400 });
    }

    const trimmedInput = rawInput.trim();

    let compressed: string;
    try {
      // Gemini's own claim of "compressed" isn't trustworthy on its own — compressPrompt
      // verifies with the same tokenizer the UI uses before trusting the result.
      ({ compressed } = await compressPrompt(trimmedInput, level, preserveFormatting));
    } catch (error) {
      if (error instanceof NoApiKeysConfiguredError) {
        return NextResponse.json({ error: "AI service is not configured. Please contact support." }, { status: 500 });
      }
      throw error;
    }

    if (!compressed) {
      return NextResponse.json({ error: "The AI did not return a result. Please try again." }, { status: 502 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          // Reveal the already-validated text progressively so the UI keeps its live feel.
          const CHUNK_SIZE = 24;
          for (let i = 0; i < compressed.length; i += CHUNK_SIZE) {
            controller.enqueue(encoder.encode(compressed.slice(i, i + CHUNK_SIZE)));
            await new Promise((resolve) => setTimeout(resolve, 12));
          }

          await consumeDailyLimit(subjectKey, TOOL);
          await saveToolRun({
            userId: subject.userId,
            tool: TOOL,
            title: titleFrom(rawInput),
            input: { input: rawInput.trim(), level, preserveFormatting },
            result: { compressedText: compressed },
            historyId: body?.historyId,
          });
          const used = await getUsedToday(subjectKey, TOOL);
          controller.enqueue(
            encoder.encode(
              encodeStreamMeta({
                isAuthenticated,
                promptsRemaining: Math.max(0, limit - used),
                promptsLimit: limit,
              })
            )
          );
          controller.close();
        } catch (error) {
          console.error("Token Optimizer stream error:", error);
          void reportError(error, { source: "api", route: "/api/tools/token-optimizer" });
          controller.enqueue(encoder.encode(encodeStreamError("Something went wrong while compressing your prompt.")));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Token Optimizer error:", error);
    void reportError(error, { source: "api", route: "/api/tools/token-optimizer" });
    if (isGenAITimeout(error)) {
      return NextResponse.json(
        { error: "The AI is taking too long to respond. Please try again." },
        { status: 504 }
      );
    }
    // Every provider in the fallback chain either rate-limited, overloaded, or rejected the request as too large.
    if (isRetryableProviderError(error) || isRequestTooLargeForProvider(error) || error instanceof AllProvidersExhaustedError) {
      return NextResponse.json({ error: HIGH_DEMAND_MESSAGE }, { status: 429 });
    }
    return NextResponse.json({ error: "Something went wrong while compressing your prompt." }, { status: 500 });
  }
}
