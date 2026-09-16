// Client-safe: no server-only imports (Prisma, etc). Anything that touches the
// database or does key rotation lives in src/lib/api-keys.ts instead, so client
// components (like the admin API Keys UI) can import provider metadata here
// without dragging Node-only modules (pg, dns, ...) into the browser bundle.

export const PROVIDERS = ["gemini", "groq", "openrouter", "grok", "openai", "claude"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: "Gemini",
  groq: "Groq",
  openrouter: "OpenRouter",
  grok: "Grok",
  openai: "ChatGPT",
  claude: "Claude",
};

export function isProvider(value: unknown): value is Provider {
  return typeof value === "string" && (PROVIDERS as readonly string[]).includes(value);
}

// Fixed categorical assignment (CVD-validated adjacency, see globals.css) — a
// provider always maps to the same slot regardless of its rank in any chart.
export const PROVIDER_CHART_COLORS: Record<Provider, string> = {
  gemini: "var(--chart-cat-1)",
  groq: "var(--chart-cat-2)",
  openrouter: "var(--chart-cat-3)",
  grok: "var(--chart-cat-4)",
  openai: "var(--chart-cat-5)",
  claude: "var(--chart-cat-6)",
};
