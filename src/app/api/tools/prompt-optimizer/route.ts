import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { getRequestSubject, hasReachedDailyLimit, consumeDailyLimit, getUsedToday } from "@/lib/rate-limit";
import { GENAI_TIMEOUT_MS, isGenAITimeout } from "@/lib/genai-timeout";
import { getPromptOptimizerLimit } from "@/lib/prompt-optimizer/limits";
import { isOptimizerMode, isOptimizerLevel, MODE_EXEMPLARS, LEVEL_GUIDANCE } from "@/lib/prompt-optimizer/constants";

const TOOL = "prompt-optimizer";

export async function POST(req: Request) {
  try {
    const { subjectKey, isAuthenticated } = await getRequestSubject(req);
    const limit = await getPromptOptimizerLimit(isAuthenticated);

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

    const setting = await prisma.setting.findUnique({ where: { key: "GEMINI_API_KEY" } });
    const apiKey = setting?.value || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service is not configured. Please contact support." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: GENAI_TIMEOUT_MS } });

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

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: metaPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            optimizedPrompt: { type: Type.STRING },
          },
          required: ["optimizedPrompt"],
        },
      },
    });

    if (!response.text) {
      return NextResponse.json({ error: "The AI did not return a result. Please try again." }, { status: 500 });
    }

    let optimizedPrompt: string;
    try {
      const parsed = JSON.parse(response.text);
      optimizedPrompt = parsed.optimizedPrompt;
      if (typeof optimizedPrompt !== "string" || !optimizedPrompt.trim()) {
        throw new Error("Empty optimizedPrompt");
      }
    } catch {
      return NextResponse.json({ error: "Could not parse the AI's response. Please try again." }, { status: 500 });
    }

    await consumeDailyLimit(subjectKey, TOOL);
    const used = await getUsedToday(subjectKey, TOOL);

    return NextResponse.json({
      optimizedPrompt,
      isAuthenticated,
      promptsRemaining: Math.max(0, limit - used),
      promptsLimit: limit,
    });
  } catch (error) {
    console.error("Prompt Optimizer error:", error);
    if (isGenAITimeout(error)) {
      return NextResponse.json(
        { error: "The AI is taking too long to respond. Please try again." },
        { status: 504 }
      );
    }
    return NextResponse.json({ error: "Something went wrong while optimizing your prompt." }, { status: 500 });
  }
}
