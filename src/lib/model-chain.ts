import "server-only";
import { geminiGenerate, openAICompatibleGenerate, type ProviderChainLink } from "@/lib/llm-generate";
import { GENAI_TIMEOUT_MS } from "@/lib/genai-timeout";

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

// OpenRouter's free catalog (the ":free" suffix) rotates constantly — check
// https://openrouter.ai/models?order=top-weekly&max_price=0 before changing this.
const OPENROUTER_MODEL = "deepseek/deepseek-chat-v3-0324:free";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/**
 * Shared text-generation fallback chain for the free-form generation tools
 * (Prompt Optimizer, Token Optimizer). Gemini is tried first (primary, highest
 * quality); Groq and OpenRouter are free-tier overflow for when Gemini's pool
 * is exhausted or unconfigured. Context Extractor is intentionally excluded —
 * it needs Gemini's embedding model specifically, and mixing embedding spaces
 * across providers would break similarity search against already-stored vectors.
 */
export function buildTextGenerationChain(timeoutMs: number = GENAI_TIMEOUT_MS): ProviderChainLink[] {
  return [
    { provider: "gemini", model: GEMINI_MODEL, generate: geminiGenerate(GEMINI_MODEL, timeoutMs) },
    {
      provider: "groq",
      model: GROQ_MODEL,
      generate: openAICompatibleGenerate(GROQ_BASE_URL, GROQ_MODEL, undefined, timeoutMs),
      maxPromptChars: GROQ_MAX_PROMPT_CHARS,
    },
    {
      provider: "openrouter",
      model: OPENROUTER_MODEL,
      generate: openAICompatibleGenerate(
        OPENROUTER_BASE_URL,
        OPENROUTER_MODEL,
        { "HTTP-Referer": "https://cuelara.com", "X-Title": "Cuelara" },
        timeoutMs
      ),
    },
  ];
}

export const TEXT_GENERATION_CHAIN: ProviderChainLink[] = buildTextGenerationChain();
