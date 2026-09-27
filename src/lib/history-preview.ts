// Each tool's ToolRun.input/result JSON has a different shape (see the saveToolRun calls in
// src/app/api/tools/*/route.ts). This picks out the one field per shape that's a plain prompt
// string worth reusing elsewhere — null when that tool's input/result isn't a single string
// (e.g. Prompt Debugger's result is an issues list, not text).
const INPUT_TEXT_KEY: Partial<Record<string, string>> = {
  "prompt-optimizer": "rawInput",
  "token-optimizer": "input",
  "prompt-builder": "idea",
  "prompt-debugger": "input",
  "prompt-formatter": "input",
  "intelligence-score": "input",
};

const RESULT_TEXT_KEY: Partial<Record<string, string>> = {
  "prompt-optimizer": "optimizedPrompt",
  "token-optimizer": "compressedText",
  "prompt-builder": "prompt",
  "prompt-formatter": "formatted",
};

function pickString(data: unknown, key: string | undefined): string | null {
  if (!key || !data || typeof data !== "object") return null;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export function extractInputText(tool: string, input: unknown): string | null {
  return pickString(input, INPUT_TEXT_KEY[tool]);
}

export function extractResultText(tool: string, result: unknown): string | null {
  return pickString(result, RESULT_TEXT_KEY[tool]);
}
