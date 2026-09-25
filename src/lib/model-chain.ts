import "server-only";
import { geminiGenerate, openAICompatibleGenerate, type ProviderChainLink } from "@/lib/llm-generate";
import { GENAI_TIMEOUT_MS } from "@/lib/genai-timeout";
import { getFreeOpenRouterModels, listFreeOpenRouterModels } from "@/lib/openrouter-free-models";
import { getModelOrder, getSelectedOpenRouterModels } from "@/lib/model-settings";
import { getOwnKeyContext } from "@/lib/user-keys";
import type { OrderableProvider } from "@/lib/model-order";
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
 * (Prompt Optimizer, Token Optimizer, Site to Prompt, ...). The order of the
 * providers is admin-controlled (drag-and-drop in Settings → API Keys); a
 * provider with no active keys is skipped at call time. Context Extractor is
 * intentionally excluded — it needs Gemini's embedding model specifically, and
 * mixing embedding spaces across providers would break similarity search
 * against already-stored vectors.
 *
 * OpenRouter contributes one link per model: the (up to two) free models the
 * admin picked, tried in order — or, if none are picked, the richest-context
 * free models from OpenRouter's live catalog (cached hourly).
 */
export async function buildTextGenerationChain(timeoutMs: number = GENAI_TIMEOUT_MS): Promise<ProviderChainLink[]> {
  // A bring-your-own-keys customer gets their own order and models, limited to providers they added keys for.
  const own = await getOwnKeyContext();
  const [platformOrder, platformMode, platformSelected] = await Promise.all([getModelOrder(), getOpenRouterModelMode(), getSelectedOpenRouterModels()]);
  const order = own ? own.order.filter((p) => (own.keys[p]?.length ?? 0) > 0) : platformOrder;
  const mode = own ? "free" : platformMode;
  const selected = own ? own.openRouterModels : platformSelected;

  async function openRouterLinks(): Promise<ProviderChainLink[]> {
    if (mode !== "free") return [];
    if (selected.length > 0) {
      const catalog = await listFreeOpenRouterModels();
      return selected.map((id) => openRouterLink(id, timeoutMs, catalog.find((m) => m.id === id)?.maxPromptChars));
    }
    return (await getFreeOpenRouterModels()).map((m) => openRouterLink(m.id, timeoutMs, m.maxPromptChars));
  }

  const linksByProvider: Record<OrderableProvider, () => Promise<ProviderChainLink[]>> = {
    gemini: async () => [{ provider: "gemini", model: GEMINI_MODEL, generate: geminiGenerate(GEMINI_MODEL, timeoutMs) }],
    groq: async () => [
      {
        provider: "groq",
        model: GROQ_MODEL,
        generate: openAICompatibleGenerate(GROQ_BASE_URL, GROQ_MODEL, undefined, timeoutMs),
        maxPromptChars: GROQ_MAX_PROMPT_CHARS,
      },
    ],
    openrouter: openRouterLinks,
  };

  return (await Promise.all(order.map((p) => linksByProvider[p]()))).flat();
}
