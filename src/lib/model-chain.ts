import "server-only";
import { geminiGenerate, openAICompatibleGenerate, type ProviderChainLink } from "@/lib/llm-generate";
import { GENAI_TIMEOUT_MS } from "@/lib/genai-timeout";
import { getFreeOpenRouterModels } from "@/lib/openrouter-free-models";
import { getOpenRouterModelMode } from "@/lib/openrouter-mode";

export const GEMINI_MODEL = "gemini-3.6-flash";

// Groq's free lineup shifts over time (Llama 3.3 70B and 3.1 8B left the free
// tier in August 2026) — check https://console.groq.com/docs/models before
// changing this away from a currently-free model.
const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
// gpt-oss-120b's free tier caps at 8,000 tokens/minute for prompt+completion combined
// (Groq account limit, not configurable). ~3.5 chars/token for JSON-heavy prompts,
// minus headroom for the completion, leaves room for well under that in the prompt
// itself — anything bigger is a guaranteed 413, so skip Groq rather than waste the call.
const GROQ_MAX_PROMPT_CHARS = 16_000;

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_HEADERS = { "HTTP-Referer": "https://cuelara.com", "X-Title": "Cuelara" };

function openRouterLink(model: string, timeoutMs: number, maxPromptChars: number | undefined): ProviderChainLink {
  return {
    provider: "openrouter",
    model,
    generate: openAICompatibleGenerate(OPENROUTER_BASE_URL, model, OPENROUTER_HEADERS, timeoutMs),
    maxPromptChars,
  };
}

/**
 * Shared text-generation fallback chain for the free-form generation tools
 * (Prompt Optimizer, Token Optimizer, Site to Prompt, ...). Gemini is tried
 * first (primary, highest quality); Groq and OpenRouter are free-tier overflow
 * for when Gemini's pool is exhausted or unconfigured. Context Extractor is
 * intentionally excluded — it needs Gemini's embedding model specifically, and
 * mixing embedding spaces across providers would break similarity search
 * against already-stored vectors.
 *
 * The OpenRouter leg is resolved dynamically: the admin "free vs paid" setting
 * decides the mode ("paid" isn't wired to a model yet, see openrouter-mode.ts),
 * and in "free" mode the currently-free catalog is fetched (cached hourly) so a
 * model OpenRouter retires or paywalls doesn't quietly dead-end the chain — one
 * link per free model (richest context first) gives a few real attempts instead of one.
 */
export async function buildTextGenerationChain(timeoutMs: number = GENAI_TIMEOUT_MS): Promise<ProviderChainLink[]> {
  const mode = await getOpenRouterModelMode();
  const freeModels = mode === "free" ? await getFreeOpenRouterModels() : [];

  return [
    { provider: "gemini", model: GEMINI_MODEL, generate: geminiGenerate(GEMINI_MODEL, timeoutMs) },
    {
      provider: "groq",
      model: GROQ_MODEL,
      generate: openAICompatibleGenerate(GROQ_BASE_URL, GROQ_MODEL, undefined, timeoutMs),
      maxPromptChars: GROQ_MAX_PROMPT_CHARS,
    },
    ...freeModels.map((m) => openRouterLink(m.id, timeoutMs, m.maxPromptChars)),
  ];
}
