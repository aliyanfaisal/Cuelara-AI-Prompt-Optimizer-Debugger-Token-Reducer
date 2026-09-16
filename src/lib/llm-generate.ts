import "server-only";
import { GoogleGenAI } from "@google/genai";
import { GENAI_TIMEOUT_MS } from "@/lib/genai-timeout";
import { callWithKeyRotation, NoApiKeysConfiguredError, isRetryableProviderError } from "@/lib/api-keys";
import type { Provider } from "@/lib/providers";

export type GenerateFn = (apiKey: string, prompt: string) => Promise<string>;

export interface ProviderChainLink {
  provider: Provider;
  /** The specific model this link calls — logged with every attempt for the admin dashboard. */
  model: string;
  generate: GenerateFn;
}

/** Thrown by an OpenAI-compatible call so isRetryableProviderError can read `.status`. */
export class ProviderHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ProviderHttpError";
    this.status = status;
  }
}

export function geminiGenerate(model: string): GenerateFn {
  return async (apiKey, prompt) => {
    const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: GENAI_TIMEOUT_MS } });
    const response = await ai.models.generateContent({ model, contents: prompt });
    return (response.text ?? "").trim();
  };
}

/**
 * Groq and OpenRouter both speak the same OpenAI-compatible chat-completions
 * shape, so one adapter covers both — just point it at a different base URL,
 * model, and (for OpenRouter) a couple of recommended attribution headers.
 */
export function openAICompatibleGenerate(
  baseUrl: string,
  model: string,
  extraHeaders?: Record<string, string>
): GenerateFn {
  return async (apiKey, prompt) => {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(GENAI_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ProviderHttpError(res.status, `${res.status} ${res.statusText}: ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" ? text.trim() : "";
  };
}

export class AllProvidersExhaustedError extends Error {
  constructor() {
    super("All configured providers are rate-limited or unavailable.");
    this.name = "AllProvidersExhaustedError";
  }
}

/**
 * Tries each provider in the chain, in order, rotating across that provider's
 * own key pool first. Falls through to the next provider only when the current
 * one has no keys configured, or every key in its pool hit a retryable error
 * (rate limit / auth / 5xx) — a genuine non-retryable error (bad input, safety
 * block) is thrown immediately instead of cascading.
 */
export async function generateWithFallback(
  chain: ProviderChainLink[],
  prompt: string,
  tool: string
): Promise<{ text: string; provider: Provider }> {
  let lastError: unknown;

  for (const { provider, model, generate } of chain) {
    try {
      const text = await callWithKeyRotation(provider, (apiKey) => generate(apiKey, prompt), { tool, model });
      return { text, provider };
    } catch (error) {
      lastError = error;
      if (error instanceof NoApiKeysConfiguredError) continue;
      if (!isRetryableProviderError(error)) throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new AllProvidersExhaustedError();
}
