import { generateWithFallback } from "@/lib/llm-generate";
import { buildTextGenerationChain } from "@/lib/model-chain";
import { MODE_EXEMPLARS, LEVEL_GUIDANCE, type OptimizerMode, type OptimizerLevel } from "@/lib/prompt-optimizer/constants";

const TOOL = "prompt-optimizer";

function buildMetaPrompt(rawInput: string, mode: OptimizerMode, level: OptimizerLevel): string {
  return `You are an expert prompt engineer. Rewrite the user's rough request below into a single, production-ready prompt they can paste directly into any frontier AI model (ChatGPT, Claude, Gemini).

USER'S RAW REQUEST:
"""
${rawInput}
"""

MODE: ${mode}
DETAIL LEVEL: ${level} — ${LEVEL_GUIDANCE[level]}

Use the following as a STRUCTURE reference for this mode (role anchoring, explicit steps, negative constraints, output format) — do not copy its wording or placeholders, write a fresh prompt grounded in the user's actual request:
"""
${MODE_EXEMPLARS[mode]}
"""

Return only the finished, ready-to-paste prompt text — no meta-commentary, no markdown fences around the whole thing, no explanation of what you did.`;
}

/**
 * Shared by the web tool (src/app/api/tools/prompt-optimizer/route.ts) and the MCP server
 * (src/app/api/mcp/route.ts), so both surfaces run the exact same optimization logic.
 * Errors (NoApiKeysConfiguredError, provider failures, timeouts) are left to bubble to the caller.
 */
export async function optimizePrompt(rawInput: string, mode: OptimizerMode, level: OptimizerLevel): Promise<string> {
  const chain = await buildTextGenerationChain();
  const result = await generateWithFallback(chain, buildMetaPrompt(rawInput.trim(), mode, level), TOOL);
  return result.text.trim();
}
