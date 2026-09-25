// Client-safe constants for the admin model-priority UI (no Prisma / server-only imports).
export const ORDERABLE_PROVIDERS = ["gemini", "groq", "openrouter"] as const;
export type OrderableProvider = (typeof ORDERABLE_PROVIDERS)[number];
export const MAX_OPENROUTER_MODELS = 2;
