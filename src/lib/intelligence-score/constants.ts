export const SCORING_CRITERIA = ["Standard (General)", "Strict (Production)", "Creative"] as const;
export const TARGET_MODELS = ["Any Model", "GPT-4 Optimization", "Claude 3 Optimization"] as const;

export type ScoringCriteria = (typeof SCORING_CRITERIA)[number];
export type TargetModel = (typeof TARGET_MODELS)[number];

export function isScoringCriteria(value: unknown): value is ScoringCriteria {
  return typeof value === "string" && (SCORING_CRITERIA as readonly string[]).includes(value);
}

export function isTargetModel(value: unknown): value is TargetModel {
  return typeof value === "string" && (TARGET_MODELS as readonly string[]).includes(value);
}

export const CRITERIA_GUIDANCE: Record<ScoringCriteria, string> = {
  "Standard (General)":
    "Judge the prompt as an everyday instruction for a chat assistant. Reward clear intent and a stated goal; do not penalize the absence of rigid schemas or exhaustive constraints for simple tasks.",
  "Strict (Production)":
    "Judge the prompt as one that will run unattended in a production pipeline or autonomous agent. Penalize heavily for missing output schemas, unbounded scope, absent negative constraints, and no fallback behavior for bad input.",
  Creative:
    "Judge the prompt as a creative-writing or ideation instruction. Reward vivid context, tone, audience, and stylistic direction; do not penalize the absence of rigid output schemas, and penalize over-constraining that would stifle creativity.",
};

export const TARGET_GUIDANCE: Record<TargetModel, string> = {
  "Any Model": "Score for general portability across major LLMs — no model-specific conventions expected.",
  "GPT-4 Optimization":
    "Score for OpenAI GPT-4-class models: reward an explicit role/system framing, clearly separated instructions and input, and precise output format requests.",
  "Claude 3 Optimization":
    "Score for Anthropic Claude 3-class models: reward XML-tag-delimited sections, explicit task framing, and clearly separated context and instructions.",
};

export interface DimensionScore {
  score: number;
  rationale: string;
}

export interface ScoreRecommendation {
  priority: "high" | "medium" | "low";
  title: string;
  detail: string;
}

export interface IntelligenceReport {
  clarity: DimensionScore;
  precision: DimensionScore;
  density: DimensionScore;
  recommendations: ScoreRecommendation[];
}

/** Weights for combining the three dimensions into the overall 0–100 score. */
export const DIMENSION_WEIGHTS = { clarity: 0.35, precision: 0.4, density: 0.25 } as const;

export function computeOverallScore(report: Pick<IntelligenceReport, "clarity" | "precision" | "density">): number {
  return Math.round(
    report.clarity.score * DIMENSION_WEIGHTS.clarity +
      report.precision.score * DIMENSION_WEIGHTS.precision +
      report.density.score * DIMENSION_WEIGHTS.density
  );
}

export type ScoreTier = "Needs Optimization" | "Acceptable (Needs Polish)" | "Strong" | "Production-Grade";

export function getScoreTier(score: number): ScoreTier {
  if (score >= 90) return "Production-Grade";
  if (score >= 75) return "Strong";
  if (score >= 50) return "Acceptable (Needs Polish)";
  return "Needs Optimization";
}
