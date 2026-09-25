import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getRequestSubject, hasReachedDailyLimit, consumeDailyLimit, getUsedToday } from "@/lib/rate-limit";
import { GENAI_TIMEOUT_MS, isGenAITimeout } from "@/lib/genai-timeout";
import { getPromptOptimizerLimit } from "@/lib/prompt-optimizer/limits";
import { isOptimizerMode, isOptimizerLevel, MODE_EXEMPLARS, LEVEL_GUIDANCE } from "@/lib/prompt-optimizer/constants";
import { encodeStreamMeta, encodeStreamError } from "@/lib/stream-protocol";
import { callWithKeyRotation, NoApiKeysConfiguredError, isRetryableProviderError, isRequestTooLargeForProvider } from "@/lib/api-keys";
import { generateWithFallback, AllProvidersExhaustedError } from "@/lib/llm-generate";
import { buildTextGenerationChain, GEMINI_MODEL } from "@/lib/model-chain";
import { HIGH_DEMAND_MESSAGE } from "@/lib/error-messages";
import { saveToolRun, titleFrom } from "@/lib/history";

const TOOL = "prompt-optimizer";

export async function POST(req: Request) {
  try {
    const subject = await getRequestSubject(req);
    const { subjectKey, isAuthenticated } = subject;
    const limit = await getPromptOptimizerLimit(subject);

    if (await hasReachedDailyLimit(subjectKey, TOOL, limit)) {
      return NextResponse.json(
        { error: `You've used your ${limit} free optimizations for today. Please try again tomorrow.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const rawInput = body?.rawInput;
    const mode = body?.mode;
    const level = body?.level;

    if (typeof rawInput !== "string" || !rawInput.trim()) {
      return NextResponse.json({ error: "Describe what you want the AI to do." }, { status: 400 });
    }
    if (!isOptimizerMode(mode)) {
      return NextResponse.json({ error: "Invalid optimization mode." }, { status: 400 });
    }
    if (!isOptimizerLevel(level)) {
      return NextResponse.json({ error: "Invalid detail level." }, { status: 400 });
    }

    const metaPrompt = `You are an expert prompt engineer. Rewrite the user's rough request below into a single, production-ready prompt they can paste directly into any frontier AI model (ChatGPT, Claude, Gemini).

USER'S RAW REQUEST:
"""
${rawInput.trim()}
"""

MODE: ${mode}
DETAIL LEVEL: ${level} — ${LEVEL_GUIDANCE[level]}

Use the following as a STRUCTURE reference for this mode (role anchoring, explicit steps, negative constraints, output format) — do not copy its wording or placeholders, write a fresh prompt grounded in the user's actual request:
"""
${MODE_EXEMPLARS[mode]}
"""

Return only the finished, ready-to-paste prompt text — no meta-commentary, no markdown fences around the whole thing, no explanation of what you did.`;

    let responseStream: Awaited<ReturnType<GoogleGenAI["models"]["generateContentStream"]>> | null = null;
    let fallbackText: string | null = null;

    const chain = await buildTextGenerationChain();
    let remainingChain = chain;

    // Gemini is the only link that streams natively — use that path when it's first in the admin's priority order.
    if (chain[0]?.provider === "gemini") {
      remainingChain = chain.slice(1);
      try {
        responseStream = await callWithKeyRotation(
          "gemini",
          (apiKey) => {
            const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: GENAI_TIMEOUT_MS } });
            return ai.models.generateContentStream({ model: GEMINI_MODEL, contents: metaPrompt });
          },
          { tool: TOOL, model: GEMINI_MODEL }
        );
      } catch (error) {
        if (!(error instanceof NoApiKeysConfiguredError) && !isRetryableProviderError(error)) throw error;
      }
    }

    if (!responseStream) {
      // Gemini isn't first, is unconfigured, or its whole pool is rate-limited — walk the rest of
      // the admin's priority list. This propagates out of the route if that is exhausted too.
      const fallback = await generateWithFallback(remainingChain, metaPrompt, TOOL);
      fallbackText = fallback.text;
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let fullText = "";
        try {
          if (responseStream) {
            for await (const chunk of responseStream) {
              if (chunk.text) {
                fullText += chunk.text;
                controller.enqueue(encoder.encode(chunk.text));
              }
            }
          } else if (fallbackText) {
            // Reveal the fallback provider's full response progressively so the UI
            // keeps its live-streaming feel even though this path isn't truly streamed.
            const CHUNK_SIZE = 24;
            for (let i = 0; i < fallbackText.length; i += CHUNK_SIZE) {
              const piece = fallbackText.slice(i, i + CHUNK_SIZE);
              fullText += piece;
              controller.enqueue(encoder.encode(piece));
              await new Promise((resolve) => setTimeout(resolve, 12));
            }
          }

          if (!fullText.trim()) {
            controller.enqueue(encoder.encode(encodeStreamError("The AI did not return a result. Please try again.")));
            controller.close();
            return;
          }

          await consumeDailyLimit(subjectKey, TOOL);
          await saveToolRun({
            userId: subject.userId,
            tool: TOOL,
            title: titleFrom(rawInput),
            input: { rawInput: rawInput.trim(), mode, level },
            result: { optimizedPrompt: fullText },
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
          console.error("Prompt Optimizer stream error:", error);
          const message = isGenAITimeout(error)
            ? "The AI is taking too long to respond. Please try again."
            : "Something went wrong while optimizing your prompt.";
          controller.enqueue(encoder.encode(encodeStreamError(message)));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Prompt Optimizer error:", error);
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
    return NextResponse.json({ error: "Something went wrong while optimizing your prompt." }, { status: 500 });
  }
}
