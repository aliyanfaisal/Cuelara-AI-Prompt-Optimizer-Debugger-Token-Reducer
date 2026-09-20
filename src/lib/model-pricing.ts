// Published API rates in USD per 1M tokens, verified against each provider's own
// pricing and model docs in September 2026. Rates change often — re-check the
// source pages below before editing, and bump PRICING_AS_OF when you do.
//   Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
//   OpenAI:    https://developers.openai.com/api/docs/models
//   Google:    https://ai.google.dev/gemini-api/docs/pricing
//   DeepSeek:  https://api-docs.deepseek.com/quick_start/pricing
export const PRICING_AS_OF = "September 2026";

export interface PricedModel {
  id: string;
  name: string;
  provider: "OpenAI" | "Anthropic" | "Google" | "DeepSeek";
  inputPer1M: number;
  outputPer1M: number;
  /** Maximum input context, in tokens. */
  contextWindow: number;
}

export const PRICED_MODELS: PricedModel[] = [
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", inputPer1M: 2.5, outputPer1M: 10, contextWindow: 128_000 },
  { id: "gpt-4o-mini", name: "GPT-4o mini", provider: "OpenAI", inputPer1M: 0.15, outputPer1M: 0.6, contextWindow: 128_000 },
  { id: "claude-sonnet-5", name: "Claude Sonnet 5", provider: "Anthropic", inputPer1M: 2, outputPer1M: 10, contextWindow: 1_000_000 },
  { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", provider: "Anthropic", inputPer1M: 1, outputPer1M: 5, contextWindow: 200_000 },
  { id: "gemini-3-6-flash", name: "Gemini 3.6 Flash", provider: "Google", inputPer1M: 0.75, outputPer1M: 3.75, contextWindow: 1_048_576 },
  { id: "gemini-3-1-pro", name: "Gemini 3.1 Pro", provider: "Google", inputPer1M: 2, outputPer1M: 12, contextWindow: 1_048_576 },
  // DeepSeek charges double during peak hours; these are the standard off-peak rates.
  { id: "deepseek-v4-flash", name: "DeepSeek V4-Flash", provider: "DeepSeek", inputPer1M: 0.15, outputPer1M: 0.6, contextWindow: 1_000_000 },
];

export function getPricedModel(id: string): PricedModel {
  return PRICED_MODELS.find((m) => m.id === id) ?? PRICED_MODELS[0];
}

/** Volume tiers offered in the estimator, in requests per month. */
export const VOLUME_TIERS = [1_000, 10_000, 100_000, 1_000_000] as const;

export const DEFAULT_OUTPUT_TOKENS = 500;

export interface RunCost {
  input: number;
  output: number;
  total: number;
}

/** Cost in USD of `requests` calls, each sending `inputTokens` and generating `outputTokens`. */
export function estimateCost(model: PricedModel, inputTokens: number, outputTokens: number, requests: number): RunCost {
  const input = (inputTokens / 1_000_000) * model.inputPer1M * requests;
  const output = (outputTokens / 1_000_000) * model.outputPer1M * requests;
  return { input, output, total: input + output };
}

/** Adaptive USD formatting — sub-cent costs (common for one call to a cheap model) keep their precision. */
export function formatUsd(amount: number): string {
  const abs = Math.abs(amount);
  if (abs === 0) return "$0.00";
  if (abs < 0.01) return `$${amount.toFixed(4)}`;
  if (abs < 1000) return `$${amount.toFixed(2)}`;
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}K`;
  return String(n);
}
