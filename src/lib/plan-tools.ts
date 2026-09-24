// The canonical set of daily-limited tools a Plan can override — must match the `tool`
// string each route passes to hasReachedDailyLimit/consumeDailyLimit (see the TOOL /
// PROMPT_TOOL / DOCUMENT_TOOL constants in each tool's route.ts).
export const PLAN_TOOLS = [
  { id: "prompt-optimizer", label: "Prompt Optimizer" },
  { id: "token-optimizer", label: "Token Optimizer" },
  { id: "prompt-debugger", label: "Prompt Debugger" },
  { id: "prompt-formatter", label: "Prompt Formatter" },
  { id: "intelligence-score", label: "Intelligence Score" },
  { id: "site-to-prompt", label: "Site to Prompt" },
  { id: "context-extractor-document", label: "Context Extractor (documents)" },
  { id: "context-extractor-prompt", label: "Context Extractor (prompts)" },
] as const;

export type PlanToolId = (typeof PLAN_TOOLS)[number]["id"];

export function isPlanToolId(value: string): value is PlanToolId {
  return PLAN_TOOLS.some((t) => t.id === value);
}
