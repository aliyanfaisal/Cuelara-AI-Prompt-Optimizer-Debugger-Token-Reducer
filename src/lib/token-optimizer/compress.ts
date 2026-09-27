import { countPromptTokens } from "@/lib/token-count";
import { generateWithFallback } from "@/lib/llm-generate";
import { buildTextGenerationChain } from "@/lib/model-chain";
import { LEVEL_GUIDANCE, type CompressionLevel, type PreserveOption } from "@/lib/token-optimizer/constants";

const TOOL = "token-optimizer";

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

export interface CompressResult {
  compressed: string;
  originalTokens: number;
  compressedTokens: number;
}

/**
 * Shared by the web tool (src/app/api/tools/token-optimizer/route.ts) and the MCP server
 * (src/app/api/mcp/route.ts), so both surfaces run the exact same compression logic.
 * Errors (NoApiKeysConfiguredError, provider failures, timeouts) are left to bubble to the caller.
 */
export async function compressPrompt(rawInput: string, level: CompressionLevel, preserveFormatting: PreserveOption): Promise<CompressResult> {
  const trimmedInput = rawInput.trim();
  const originalTokenCount = countPromptTokens(trimmedInput);

  const chain = await buildTextGenerationChain();
  const firstAttempt = await generateWithFallback(chain, buildCompressionPrompt(trimmedInput, level, preserveFormatting), TOOL);
  let compressed = firstAttempt.text.trim();

  // One retry when the first pass didn't actually shrink it — swallowed on failure so a
  // slow/failing retry falls back to the first result instead of failing the whole call.
  if (compressed && countPromptTokens(compressed) >= originalTokenCount) {
    try {
      const retry = await generateWithFallback(chain, buildRetryPrompt(trimmedInput, compressed), TOOL);
      const retryText = retry.text.trim();
      if (retryText && countPromptTokens(retryText) < countPromptTokens(compressed)) {
        compressed = retryText;
      }
    } catch (retryError) {
      console.warn("Token Optimizer retry skipped:", retryError);
    }
  }

  return { compressed, originalTokens: originalTokenCount, compressedTokens: countPromptTokens(compressed || trimmedInput) };
}
