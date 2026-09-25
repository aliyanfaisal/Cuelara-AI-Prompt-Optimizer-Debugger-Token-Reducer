import "server-only";

export interface FreeOpenRouterModel {
  id: string;
  contextLength?: number;
  /** Rough char budget derived from the model's reported context window, for the same guard used elsewhere in the chain. */
  maxPromptChars: number | undefined;
}

interface OpenRouterModelEntry {
  id: string;
  pricing?: { prompt?: string; completion?: string };
  context_length?: number;
  architecture?: { output_modalities?: string[] };
}

const MODELS_URL = "https://openrouter.ai/api/v1/models";
// The free catalog rotates over days/weeks (models get added, retired, or moved behind
// a paywall), not minute to minute, so an hour-old list is still accurate enough.
const CACHE_TTL_MS = 60 * 60 * 1000;
// Deep enough to survive one or two free models being temporarily overloaded without
// trying every free model OpenRouter has on a bad day.
const MAX_FREE_MODELS = 3;
// Used only if OpenRouter's /models endpoint itself is unreachable and no cached list exists yet.
const HARDCODED_FALLBACK: FreeOpenRouterModel[] = [{ id: "deepseek/deepseek-chat-v3-0324:free", maxPromptChars: undefined }];

// Reserve headroom for the completion out of the model's total context window before
// converting the rest to a char budget (~3.5 chars/token holds up well for JSON-heavy prompts).
const COMPLETION_TOKEN_RESERVE = 2_000;
const CHARS_PER_TOKEN = 3.5;

let cache: { models: FreeOpenRouterModel[]; expiresAt: number } | null = null;

function isFree(model: OpenRouterModelEntry): boolean {
  if (model.id.endsWith(":free")) return true;
  const prompt = Number(model.pricing?.prompt ?? "1");
  const completion = Number(model.pricing?.completion ?? "1");
  return prompt === 0 && completion === 0;
}

// A $0-priced model isn't necessarily a text chat model — OpenRouter's catalog includes
// free audio/music-generation models (e.g. Google Lyria) that would just error on a plain
// text prompt. Only keep models that actually output text; input modality is unrestricted
// since every call here sends plain text content.
function isTextGenerationModel(model: OpenRouterModelEntry): boolean {
  const outputs = model.architecture?.output_modalities;
  // Require text-only output — a model that ALSO outputs audio/image (e.g. Google Lyria,
  // a free music-generation model) isn't reliably usable through a plain chat-completions call.
  return !outputs || (outputs.length === 1 && outputs[0] === "text");
}

function toMaxPromptChars(contextLength: number | undefined): number | undefined {
  if (!contextLength || contextLength <= COMPLETION_TOKEN_RESERVE) return undefined;
  return Math.floor((contextLength - COMPLETION_TOKEN_RESERVE) * CHARS_PER_TOKEN);
}

/**
 * OpenRouter's free (":free" or $0-priced) models, richest context window first, refreshed
 * hourly. Lets the fallback chain use whatever is currently free instead of one hardcoded
 * model id that OpenRouter can retire or paywall at any time.
 */
export async function listFreeOpenRouterModels(): Promise<FreeOpenRouterModel[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.models;

  try {
    const res = await fetch(MODELS_URL, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = (await res.json()) as { data?: OpenRouterModelEntry[] };

    const models = (data.data ?? [])
      .filter((m) => isFree(m) && isTextGenerationModel(m))
      .sort((a, b) => (b.context_length ?? 0) - (a.context_length ?? 0))
      .map((m) => ({ id: m.id, contextLength: m.context_length, maxPromptChars: toMaxPromptChars(m.context_length) }));

    const resolved = models.length > 0 ? models : HARDCODED_FALLBACK;
    cache = { models: resolved, expiresAt: Date.now() + CACHE_TTL_MS };
    return resolved;
  } catch {
    // A failed listing call says nothing about whether a generation call would succeed —
    // keep serving the last good list (even stale) rather than collapsing to one model.
    return cache?.models ?? HARDCODED_FALLBACK;
  }
}

/** The richest-context few, used when the admin hasn't picked specific models. */
export async function getFreeOpenRouterModels(): Promise<FreeOpenRouterModel[]> {
  return (await listFreeOpenRouterModels()).slice(0, MAX_FREE_MODELS);
}
