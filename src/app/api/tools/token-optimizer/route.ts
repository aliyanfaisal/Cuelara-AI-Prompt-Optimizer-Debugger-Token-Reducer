import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getRequestSubject, hasReachedDailyLimit, consumeDailyLimit, getUsedToday } from "@/lib/rate-limit";
import { GENAI_TIMEOUT_MS, isGenAITimeout } from "@/lib/genai-timeout";
import { getTokenOptimizerLimit } from "@/lib/token-optimizer/limits";
import { isCompressionLevel, isPreserveOption, LEVEL_GUIDANCE, type CompressionLevel, type PreserveOption } from "@/lib/token-optimizer/constants";
import { encodeStreamMeta, encodeStreamError } from "@/lib/stream-protocol";
import { countPromptTokens } from "@/lib/token-count";
import { callWithKeyRotation, NoApiKeysConfiguredError, isRetryableProviderError } from "@/lib/api-keys";

const TOOL = "token-optimizer";
const MODEL = "gemini-3.6-flash";
const RETRY_TIMEOUT_MS = 8_000;

const QUALITY_RULES = `Priority order (most important first):
1. The result must remain fully correct, grammatical, and immediately understandable — a professional prompt engineer would still find it clear and unambiguous.
2. Preserve every constraint, instruction, variable, and example from the original — never drop meaning.
3. Only within those two rules, minimize token count as much as the compression level below allows.

Never invent abbreviations, drop letters from words, or produce fragments a reader wouldn't recognize as real language (e.g. do not shorten "string" to "str" or "function" to "fn" unless that shorthand already appeared in the original). If the input is already minimal and there is no way to shorten it further without breaking rule 1 or 2, return it unchanged rather than degrading it — an honest unchanged result is far better than a mangled one.`;

function buildCompressionPrompt(rawInput: string, level: CompressionLevel, preserveFormatting: PreserveOption): string {
  return `You are an expert prompt compression engine. Rewrite the user's prompt below so it uses fewer tokens while preserving 100% of its meaning.

COMPRESSION LEVEL: ${level} — ${LEVEL_GUIDANCE[level]}
PRESERVE ORIGINAL FORMATTING: ${
    preserveFormatting === "Yes"
      ? "Yes — keep the existing structure (headers, lists, code blocks) intact, only compress the wording within it."
      : "No — you may restructure freely (e.g. convert prose into bullets) if it saves more tokens."
  }

${QUALITY_RULES}

ORIGINAL PROMPT:
"""
${rawInput}
"""

Return only the compressed prompt text — no meta-commentary, no explanation of what you changed, no markdown fences around the whole output.`;
}

function buildRetryPrompt(rawInput: string, previousAttempt: string): string {
  return `Your previous compression attempt didn't reduce the token count. Look again for genuinely removable redundancy — filler words, repeated qualifiers, unnecessary connective phrases — and produce a shorter version of the ORIGINAL PROMPT below.

${QUALITY_RULES}

If, after applying those rules, you truly find nothing safe to remove, return the ORIGINAL PROMPT unchanged rather than forcing a cut that breaks rule 1 or 2.

ORIGINAL PROMPT:
"""
${rawInput}
"""

YOUR PREVIOUS ATTEMPT (no shorter than the original):
"""
${previousAttempt}
"""

Return only the final prompt text — no meta-commentary, no explanation, no markdown fences.`;
}

export async function POST(req: Request) {
  try {
    const { subjectKey, isAuthenticated } = await getRequestSubject(req);
    const limit = await getTokenOptimizerLimit(isAuthenticated);

    if (await hasReachedDailyLimit(subjectKey, TOOL, limit)) {
      return NextResponse.json(
        { error: `You've used your ${limit} free compressions for today. Please try again tomorrow.` },
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
    const originalTokenCount = countPromptTokens(trimmedInput);

    let compressed: string;
    try {
      compressed = await callWithKeyRotation("gemini", async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: GENAI_TIMEOUT_MS } });

        // Gemini's own claim of "compressed" isn't trustworthy on its own — verify with
        // the same tokenizer the UI uses before trusting the result.
        const firstAttempt = await ai.models.generateContent({
          model: MODEL,
          contents: buildCompressionPrompt(trimmedInput, level, preserveFormatting),
        });
        let result = (firstAttempt.text ?? "").trim();

        // One retry when the first pass didn't actually shrink it — but on a short, fixed
        // budget of its own, so a slow/failing retry falls back to the first result instead
        // of blowing past the route's overall timeout.
        if (result && countPromptTokens(result) >= originalTokenCount) {
          try {
            const retry = await ai.models.generateContent({
              model: MODEL,
              contents: buildRetryPrompt(trimmedInput, result),
              config: { httpOptions: { timeout: RETRY_TIMEOUT_MS } },
            });
            const retryText = (retry.text ?? "").trim();
            if (retryText && countPromptTokens(retryText) < countPromptTokens(result)) {
              result = retryText;
            }
          } catch (retryError) {
            console.warn("Token Optimizer retry skipped:", retryError);
          }
        }

        return result;
      });
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
    if (isGenAITimeout(error)) {
      return NextResponse.json(
        { error: "The AI is taking too long to respond. Please try again." },
        { status: 504 }
      );
    }
    // Every key in the rotation pool was tried and all hit a rate limit/quota error.
    if (isRetryableProviderError(error)) {
      return NextResponse.json(
        { error: "All configured API keys are currently rate-limited. Please try again shortly." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "Something went wrong while compressing your prompt." }, { status: 500 });
  }
}
