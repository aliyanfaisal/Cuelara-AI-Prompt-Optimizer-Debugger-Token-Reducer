export const STRICTNESS_LEVELS = ["Standard", "High", "Paranoid"] as const;
export const FOCUS_AREAS = ["All Vulnerabilities", "Logic Loopholes", "Edge-cases", "Bias & Tone"] as const;

export type StrictnessLevel = (typeof STRICTNESS_LEVELS)[number];
export type FocusArea = (typeof FOCUS_AREAS)[number];

export const STRICTNESS_GUIDANCE: Record<StrictnessLevel, string> = {
  Standard: "Flag only clear-cut problems: direct contradictions, missing output format, and obviously unbounded scope. Do not nitpick minor style choices.",
  High: "Also flag subtler issues: ambiguous pronouns, conflicting adjectives, loosely-defined success criteria, and edge cases the prompt doesn't address.",
  Paranoid: "Apply zero-tolerance review: also flag potential prompt-injection vectors, tone-leakage risks, missing refusal/fallback instructions, and any place a malicious or malformed input could break the prompt's intent.",
};

export const FOCUS_GUIDANCE: Record<FocusArea, string> = {
  "All Vulnerabilities": "Consider every category: contradictions, unbounded scope, missing format constraints, ambiguity, and (at Paranoid strictness) injection/bias risks.",
  "Logic Loopholes": "Focus only on contradictory or self-defeating instructions — rules that conflict with each other or that the model cannot simultaneously satisfy.",
  "Edge-cases": "Focus only on unhandled edge cases — inputs, states, or scenarios the prompt doesn't tell the model how to handle.",
  "Bias & Tone": "Focus only on tone stability and bias risks — ambiguous emotional register, leading language, or potential for skewed/discriminatory output.",
};

export function isStrictnessLevel(value: unknown): value is StrictnessLevel {
  return typeof value === "string" && (STRICTNESS_LEVELS as readonly string[]).includes(value);
}

export function isFocusArea(value: unknown): value is FocusArea {
  return typeof value === "string" && (FOCUS_AREAS as readonly string[]).includes(value);
}

export type IssueSeverity = "critical" | "warning";

export interface DebuggerIssue {
  id: string;
  severity: IssueSeverity;
  title: string;
  explanation: string;
  fix: string;
}

export interface DebuggerPassedCheck {
  title: string;
  detail: string;
}

export interface DebuggerReport {
  issues: DebuggerIssue[];
  passedChecks: DebuggerPassedCheck[];
}
