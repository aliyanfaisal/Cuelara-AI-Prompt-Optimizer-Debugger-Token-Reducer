import { NextResponse } from "next/server";
import { getRequestSubject, hasReachedDailyLimit, consumeDailyLimit, getUsedToday } from "@/lib/rate-limit";
import { isGenAITimeout } from "@/lib/genai-timeout";
import { getPromptBuilderLimit } from "@/lib/prompt-builder/limits";
import {
  MAX_IDEA_CHARS,
  TARGET_GUIDANCE,
  USE_CASE_GUIDANCE,
  DETAIL_GUIDANCE,
  isBuilderTarget,
  isBuilderUseCase,
  isBuilderDetail,
  type BuilderTarget,
  type BuilderUseCase,
  type BuilderDetail,
} from "@/lib/prompt-builder/constants";
import { NoApiKeysConfiguredError, isRetryableProviderError, isRequestTooLargeForProvider } from "@/lib/api-keys";
import { generateWithFallback, AllProvidersExhaustedError } from "@/lib/llm-generate";
import { buildTextGenerationChain } from "@/lib/model-chain";
import { HIGH_DEMAND_MESSAGE } from "@/lib/error-messages";
import { saveToolRun, titleFrom } from "@/lib/history";
import { reportError } from "@/lib/error-report";

const TOOL = "prompt-builder";

function buildBuilderPrompt(idea: string, target: BuilderTarget, useCase: BuilderUseCase, detail: BuilderDetail): string {
  return `You are an expert prompt engineer. Turn the user's rough idea below into one finished, ready-to-paste prompt for an AI model.

Rules:
- Preserve the user's intent exactly. Never invent requirements, features, audiences, technologies, names or numbers that the idea does not state or clearly imply.
- If a detail a good prompt needs is missing, do not guess it: write a short bracketed placeholder the user can fill in, such as [YOUR AUDIENCE] or [PROGRAMMING LANGUAGE]. Use placeholders sparingly, only for details that genuinely change the result.
- Make the prompt clearer, more specific and better structured, but as short as it can be while staying unambiguous. Do not pad, repeat yourself, or add generic filler such as "be helpful" or "think step by step" unless the idea calls for it.
- Include only the sections that apply (for example role, task, context, requirements, constraints, output format). Give the AI a role only if it helps the task.
- The prompt is addressed to the AI that will run it — write it as instructions to that AI, not as a description of the prompt.

TARGET MODEL: ${TARGET_GUIDANCE[target]}
USE CASE: ${USE_CASE_GUIDANCE[useCase]}
LENGTH: ${DETAIL_GUIDANCE[detail]}

USER'S IDEA:
"""
${idea}
"""

Return ONLY the finished prompt — no preamble, no explanation, no commentary after it, and no code fence around the whole thing.`;
}

function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:\w+)?\s*([\s\S]*?)```$/);
  return (fenced ? fenced[1] : trimmed).trim();
}

export async function POST(req: Request) {
  try {
    const subject = await getRequestSubject(req);
    const { subjectKey, isAuthenticated } = subject;
    const limit = await getPromptBuilderLimit(subject);

    if (await hasReachedDailyLimit(subjectKey, TOOL, limit)) {
      return NextResponse.json({ error: `You've used your ${limit} free prompts for today. Please try again tomorrow.` }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const idea = body?.idea;
    const target = body?.target;
    const useCase = body?.useCase;
    const detail = body?.detail;

    if (typeof idea !== "string" || !idea.trim()) {
      return NextResponse.json({ error: "Describe what you want the prompt to do." }, { status: 400 });
    }
    if (idea.trim().length > MAX_IDEA_CHARS) {
      return NextResponse.json({ error: `Keep your idea under ${MAX_IDEA_CHARS.toLocaleString()} characters.` }, { status: 400 });
    }
    if (!isBuilderTarget(target)) return NextResponse.json({ error: "Invalid target model." }, { status: 400 });
    if (!isBuilderUseCase(useCase)) return NextResponse.json({ error: "Invalid use case." }, { status: 400 });
    if (!isBuilderDetail(detail)) return NextResponse.json({ error: "Invalid detail level." }, { status: 400 });

    const trimmedIdea = idea.trim();

    let built = "";
    try {
      const chain = await buildTextGenerationChain();
      const attempt = await generateWithFallback(chain, buildBuilderPrompt(trimmedIdea, target, useCase, detail), TOOL);
      built = stripFences(attempt.text);

      if (!built) {
        const retry = await generateWithFallback(
          chain,
          `${buildBuilderPrompt(trimmedIdea, target, useCase, detail)}\n\nYou returned nothing usable. Return the finished prompt text now.`,
          TOOL
        );
        built = stripFences(retry.text);
      }
    } catch (error) {
      if (error instanceof NoApiKeysConfiguredError) {
        return NextResponse.json({ error: "AI service is not configured. Please contact support." }, { status: 500 });
      }
      throw error;
    }

    if (!built) {
      return NextResponse.json({ error: "The AI did not return a usable result. Please try again." }, { status: 502 });
    }

    await consumeDailyLimit(subjectKey, TOOL);
    await saveToolRun({
      userId: subject.userId,
      tool: TOOL,
      title: titleFrom(idea),
      input: { idea: trimmedIdea, target, useCase, detail },
      result: { prompt: built },
      historyId: body?.historyId,
    });
    const used = await getUsedToday(subjectKey, TOOL);

    return NextResponse.json({
      prompt: built,
      isAuthenticated,
      promptsRemaining: Math.max(0, limit - used),
      promptsLimit: limit,
    });
  } catch (error) {
    console.error("Prompt Builder error:", error);
    void reportError(error, { source: "api", route: "/api/tools/prompt-builder" });
    if (isGenAITimeout(error)) {
      return NextResponse.json({ error: "The AI is taking too long to respond. Please try again." }, { status: 504 });
    }
    if (isRetryableProviderError(error) || isRequestTooLargeForProvider(error) || error instanceof AllProvidersExhaustedError) {
      return NextResponse.json({ error: HIGH_DEMAND_MESSAGE }, { status: 429 });
    }
    return NextResponse.json({ error: "Something went wrong while building your prompt." }, { status: 500 });
  }
}
