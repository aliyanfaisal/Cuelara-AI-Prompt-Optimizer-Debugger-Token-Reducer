import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { getRequestSubject, hasReachedDailyLimit, consumeDailyLimit, getUsedToday } from "@/lib/rate-limit";
import { GENAI_TIMEOUT_MS, isGenAITimeout } from "@/lib/genai-timeout";
import { getTokenOptimizerLimit } from "@/lib/token-optimizer/limits";
import { isCompressionLevel, isPreserveOption, LEVEL_GUIDANCE } from "@/lib/token-optimizer/constants";
import { encodeStreamMeta, encodeStreamError } from "@/lib/stream-protocol";

const TOOL = "token-optimizer";

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

    const setting = await prisma.setting.findUnique({ where: { key: "GEMINI_API_KEY" } });
    const apiKey = setting?.value || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service is not configured. Please contact support." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: GENAI_TIMEOUT_MS } });

    const metaPrompt = `You are an expert prompt compression engine. Compress the user's prompt below to reduce its token footprint while preserving 100% of its meaning, instructions, constraints, variables, and examples.

COMPRESSION LEVEL: ${level} — ${LEVEL_GUIDANCE[level]}
PRESERVE ORIGINAL FORMATTING: ${
      preserveFormatting === "Yes"
        ? "Yes — keep the existing structure (headers, lists, code blocks) intact, only compress the wording within it."
        : "No — you may restructure freely (e.g. convert prose into bullets) if it saves more tokens."
    }

ORIGINAL PROMPT:
"""
${rawInput.trim()}
"""

Return only the compressed prompt text — no meta-commentary, no explanation of what you changed, no markdown fences around the whole output.`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let fullText = "";
        try {
          const responseStream = await ai.models.generateContentStream({
            model: "gemini-3.6-flash",
            contents: metaPrompt,
          });

          for await (const chunk of responseStream) {
            if (chunk.text) {
              fullText += chunk.text;
              controller.enqueue(encoder.encode(chunk.text));
            }
          }

          if (!fullText.trim()) {
            controller.enqueue(encoder.encode(encodeStreamError("The AI did not return a result. Please try again.")));
            controller.close();
            return;
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
          const message = isGenAITimeout(error)
            ? "The AI is taking too long to respond. Please try again."
            : "Something went wrong while compressing your prompt.";
          controller.enqueue(encoder.encode(encodeStreamError(message)));
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
    return NextResponse.json({ error: "Something went wrong while compressing your prompt." }, { status: 500 });
  }
}
