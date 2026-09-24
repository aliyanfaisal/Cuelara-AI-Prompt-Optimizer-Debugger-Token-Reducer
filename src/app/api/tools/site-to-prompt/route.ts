import { NextResponse } from "next/server";
import { getRequestSubject, hasReachedDailyLimit, consumeDailyLimit, getUsedToday } from "@/lib/rate-limit";
import { isGenAITimeout } from "@/lib/genai-timeout";
import { NoApiKeysConfiguredError, isRetryableProviderError, isRequestTooLargeForProvider } from "@/lib/api-keys";
import { generateWithFallback, AllProvidersExhaustedError } from "@/lib/llm-generate";
import { buildTextGenerationChain } from "@/lib/model-chain";
import { getSiteToPromptLimits } from "@/lib/site-to-prompt/limits";
import { PROMPT_TOOL, MAX_GOAL_LENGTH, isTarget } from "@/lib/site-to-prompt/constants";
import { designDnaSchema } from "@/lib/site-to-prompt/schema";
import { buildSitePrompt, stripFences } from "@/lib/site-to-prompt/prompt";

// A whole page's structure in, a long build prompt out — slower than the other tools' short prompts.
const GENERATION_TIMEOUT_MS = 150_000;
const CHAIN = buildTextGenerationChain(GENERATION_TIMEOUT_MS);

export const maxDuration = 300;

// Gemini answers "high demand" (503) in short spikes, and the free fallbacks can't take a prompt this large,
// so a brief pause and another pass through the chain usually succeeds where an immediate error would not.
const RETRY_DELAYS_MS = [0, 5_000, 12_000];

const HIGH_DEMAND_MESSAGE =
  "Our free AI models are experiencing heavy demand right now. Please wait a minute and try again.";

async function generateWithRetry(prompt: string) {
  let lastError: unknown;
  for (const delay of RETRY_DELAYS_MS) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      return await generateWithFallback(CHAIN, prompt, PROMPT_TOOL);
    } catch (error) {
      lastError = error;
      if (!isRetryableProviderError(error) && !isRequestTooLargeForProvider(error)) throw error;
    }
  }
  throw lastError;
}

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

    const sectionCount = parsed.data.layout.sections.length;
    const rawSelection: unknown[] = Array.isArray(body?.selectedSections) ? body.selectedSections : [];
    const validIndices: number[] = rawSelection.filter(
      (n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n < sectionCount
    );
    const selectedSections = rawSelection.length > 0 ? [...new Set(validIndices)].sort((a, b) => a - b) : null;
    // An empty or missing selection means "no filter" — the client is expected to keep at least one
    // section checked, but if it somehow sends none, generating from every section beats erroring out.
    const dna =
      selectedSections && selectedSections.length > 0 && selectedSections.length < sectionCount
        ? { ...parsed.data, layout: { ...parsed.data.layout, sections: selectedSections.map((i) => parsed.data.layout.sections[i]) } }
        : parsed.data;

    let text: string;
    try {
      const attempt = await generateWithRetry(buildSitePrompt(dna, body.target, goal));
      text = stripFences(attempt.text);
    } catch (error) {
      if (error instanceof NoApiKeysConfiguredError) {
        return NextResponse.json({ error: "AI service is not configured. Please contact support." }, { status: 500 });
      }
      if (isRetryableProviderError(error) || isRequestTooLargeForProvider(error) || error instanceof AllProvidersExhaustedError) {
        return NextResponse.json({ error: HIGH_DEMAND_MESSAGE }, { status: 429 });
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
    if (isRetryableProviderError(error) || isRequestTooLargeForProvider(error) || error instanceof AllProvidersExhaustedError) {
      return NextResponse.json({ error: HIGH_DEMAND_MESSAGE }, { status: 429 });
    }
    return NextResponse.json({ error: "Something went wrong while generating your prompt." }, { status: 500 });
  }
}
