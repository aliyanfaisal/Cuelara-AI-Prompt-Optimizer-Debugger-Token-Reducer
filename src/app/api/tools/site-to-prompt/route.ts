import { NextResponse } from "next/server";
import { getRequestSubject, hasReachedDailyLimit, consumeDailyLimit, getUsedToday } from "@/lib/rate-limit";
import { isGenAITimeout } from "@/lib/genai-timeout";
import { NoApiKeysConfiguredError, isRetryableProviderError } from "@/lib/api-keys";
import { generateWithFallback } from "@/lib/llm-generate";
import { buildTextGenerationChain } from "@/lib/model-chain";
import { getSiteToPromptLimits } from "@/lib/site-to-prompt/limits";
import { PROMPT_TOOL, MAX_GOAL_LENGTH, isTarget } from "@/lib/site-to-prompt/constants";
import { designDnaSchema } from "@/lib/site-to-prompt/schema";
import { buildSitePrompt, stripFences } from "@/lib/site-to-prompt/prompt";

// A whole page's structure in, a long build prompt out — slower than the other tools' short prompts.
const GENERATION_TIMEOUT_MS = 150_000;
const CHAIN = buildTextGenerationChain(GENERATION_TIMEOUT_MS);

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { subjectKey, isAuthenticated } = await getRequestSubject(req);
    const { promptLimit } = await getSiteToPromptLimits(isAuthenticated);

    if (await hasReachedDailyLimit(subjectKey, PROMPT_TOOL, promptLimit)) {
      return NextResponse.json(
        { error: `You've used your ${promptLimit} free prompts for today. Please try again tomorrow.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = designDnaSchema.safeParse(body?.dna);
    if (!parsed.success) return NextResponse.json({ error: "Invalid design data. Analyse the site again." }, { status: 400 });
    if (!isTarget(body?.target)) return NextResponse.json({ error: "Invalid target." }, { status: 400 });
    const goal = typeof body?.goal === "string" ? body.goal.trim().slice(0, MAX_GOAL_LENGTH) : "";

    let text: string;
    try {
      const attempt = await generateWithFallback(CHAIN, buildSitePrompt(parsed.data, body.target, goal), PROMPT_TOOL);
      text = stripFences(attempt.text);
    } catch (error) {
      if (error instanceof NoApiKeysConfiguredError) {
        return NextResponse.json({ error: "AI service is not configured. Please contact support." }, { status: 500 });
      }
      throw error;
    }
    if (!text) return NextResponse.json({ error: "The AI did not return a usable result. Please try again." }, { status: 502 });

    await consumeDailyLimit(subjectKey, PROMPT_TOOL);
    const used = await getUsedToday(subjectKey, PROMPT_TOOL);
    return NextResponse.json({ prompt: text, promptsRemaining: Math.max(0, promptLimit - used), promptsLimit: promptLimit });
  } catch (error) {
    console.error("Site to Prompt error:", error);
    if (isGenAITimeout(error)) return NextResponse.json({ error: "The AI is taking too long to respond. Please try again." }, { status: 504 });
    if (isRetryableProviderError(error)) {
      return NextResponse.json({ error: "All configured API keys are currently rate-limited. Please try again shortly." }, { status: 429 });
    }
    return NextResponse.json({ error: "Something went wrong while generating your prompt." }, { status: 500 });
  }
}
