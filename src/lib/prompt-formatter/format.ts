import { generateWithFallback } from "@/lib/llm-generate";
import { buildTextGenerationChain } from "@/lib/model-chain";
import { FORMAT_GUIDANCE, indentToSpaces, type FormatStyle, type IndentSize } from "@/lib/prompt-formatter/constants";

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

/**
 * Shared by the web tool (src/app/api/tools/prompt-formatter/route.ts) and the REST API
 * (src/app/api/v1/format-prompt/route.ts), so both surfaces run the exact same formatting logic.
 * Returns null when the model never produced a usable result; provider errors bubble to the caller.
 */
export async function formatPrompt(rawInput: string, format: FormatStyle, indent: IndentSize): Promise<string | null> {
  const input = rawInput.trim();
  const chain = await buildTextGenerationChain();
  const attempt = await generateWithFallback(chain, buildFormatPrompt(input, format), TOOL);
  const formatted = finalizeOutput(attempt.text, format, indent);
  if (formatted) return formatted;

  // The model didn't return a clean, parseable result — one retry with a sharper reminder.
  const retry = await generateWithFallback(
    chain,
    `${buildFormatPrompt(input, format)}\n\nReturn ONLY the raw formatted result. No markdown fences, no leading or trailing text.`,
    TOOL
  );
  return finalizeOutput(retry.text, format, indent);
}
