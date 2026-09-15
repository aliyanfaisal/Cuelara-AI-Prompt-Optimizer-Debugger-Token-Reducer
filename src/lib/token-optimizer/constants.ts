export const COMPRESSION_LEVELS = ["Low (Safest)", "Medium (Balanced)", "Aggressive (Max Savings)"] as const;
export const PRESERVE_OPTIONS = ["Yes", "No"] as const;

export type CompressionLevel = (typeof COMPRESSION_LEVELS)[number];
export type PreserveOption = (typeof PRESERVE_OPTIONS)[number];

export const LEVEL_GUIDANCE: Record<CompressionLevel, string> = {
  "Low (Safest)": "Remove only obvious conversational filler and polite fluff (e.g. \"could you please\", \"I would like you to\", \"thank you\"). Keep sentence structure, examples, and every detail fully intact. Target roughly 15-25% reduction.",
  "Medium (Balanced)": "Restructure verbose paragraphs into concise, high-density statements and bullet points. Consolidate redundant phrasing. Target roughly 35-45% reduction while keeping every constraint and instruction.",
  "Aggressive (Max Savings)": "Apply dense shorthand notation, terse imperative phrasing, and aggressive structural compression. Strip every non-essential word. Target 50%+ reduction — but never delete a constraint, variable, or instruction, only the words around it.",
};

export function isCompressionLevel(value: unknown): value is CompressionLevel {
  return typeof value === "string" && (COMPRESSION_LEVELS as readonly string[]).includes(value);
}

export function isPreserveOption(value: unknown): value is PreserveOption {
  return typeof value === "string" && (PRESERVE_OPTIONS as readonly string[]).includes(value);
}
