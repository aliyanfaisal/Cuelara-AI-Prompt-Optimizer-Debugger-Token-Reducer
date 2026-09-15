import { countTokens } from "gpt-tokenizer";

// gpt-tokenizer's default export uses o200k_base (GPT-4o's encoding) — close enough
// to Claude's and Gemini's own tokenizers to use as the site-wide reference count,
// and it runs synchronously in the browser with no WASM or server round-trip.
export function countPromptTokens(text: string): number {
  if (!text) return 0;
  try {
    return countTokens(text);
  } catch {
    return Math.max(1, Math.ceil(text.length / 4));
  }
}
