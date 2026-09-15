// Client-safe: no server-only imports (Prisma, etc). Anything that touches the
// database or does key rotation lives in src/lib/api-keys.ts instead, so client
// components (like the admin API Keys UI) can import provider metadata here
// without dragging Node-only modules (pg, dns, ...) into the browser bundle.

export const PROVIDERS = ["gemini", "grok", "openai", "claude"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: "Gemini",
  grok: "Grok",
  openai: "ChatGPT",
  claude: "Claude",
};

export function isProvider(value: unknown): value is Provider {
  return typeof value === "string" && (PROVIDERS as readonly string[]).includes(value);
}
