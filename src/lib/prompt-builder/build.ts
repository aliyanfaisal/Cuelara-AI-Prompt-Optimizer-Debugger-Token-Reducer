import { generateWithFallback } from "@/lib/llm-generate";
import { buildTextGenerationChain } from "@/lib/model-chain";
import { TARGET_GUIDANCE, USE_CASE_GUIDANCE, DETAIL_GUIDANCE, type BuilderTarget, type BuilderUseCase, type BuilderDetail } from "@/lib/prompt-builder/constants";

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

/**
 * Shared by the web tool (src/app/api/tools/prompt-builder/route.ts) and the MCP server
 * (src/app/api/mcp/route.ts), so both surfaces run the exact same build logic.
 * Errors (NoApiKeysConfiguredError, provider failures, timeouts) are left to bubble to the caller.
 */
export async function buildPrompt(idea: string, target: BuilderTarget, useCase: BuilderUseCase, detail: BuilderDetail): Promise<string> {
  const trimmedIdea = idea.trim();
  const chain = await buildTextGenerationChain();

  const attempt = await generateWithFallback(chain, buildBuilderPrompt(trimmedIdea, target, useCase, detail), TOOL);
  let built = stripFences(attempt.text);

  if (!built) {
    const retry = await generateWithFallback(
      chain,
      `${buildBuilderPrompt(trimmedIdea, target, useCase, detail)}\n\nYou returned nothing usable. Return the finished prompt text now.`,
      TOOL
    );
    built = stripFences(retry.text);
  }

  return built;
}
