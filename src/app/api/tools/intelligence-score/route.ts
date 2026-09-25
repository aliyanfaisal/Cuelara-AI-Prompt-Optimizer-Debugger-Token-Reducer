import { NextResponse } from "next/server";
import { getRequestSubject, hasReachedDailyLimit, consumeDailyLimit, getUsedToday } from "@/lib/rate-limit";
import { isGenAITimeout } from "@/lib/genai-timeout";
import { getIntelligenceScoreLimit } from "@/lib/intelligence-score/limits";
import {
  isScoringCriteria,
  isTargetModel,
  CRITERIA_GUIDANCE,
  TARGET_GUIDANCE,
  computeOverallScore,
  getScoreTier,
  type ScoringCriteria,
  type TargetModel,
  type IntelligenceReport,
  type DimensionScore,
  type ScoreRecommendation,
} from "@/lib/intelligence-score/constants";
import { NoApiKeysConfiguredError, isRetryableProviderError, isRequestTooLargeForProvider } from "@/lib/api-keys";
import { generateWithFallback, AllProvidersExhaustedError } from "@/lib/llm-generate";
import { buildTextGenerationChain } from "@/lib/model-chain";
import { HIGH_DEMAND_MESSAGE } from "@/lib/error-messages";
import { saveToolRun, titleFrom } from "@/lib/history";
import { reportError } from "@/lib/error-report";

const TOOL = "intelligence-score";

function buildScorePrompt(rawInput: string, criteria: ScoringCriteria, target: TargetModel): string {
  return `You are an expert prompt engineer grading the quality of a prompt an LLM will receive. Grade only the prompt as written — never reward what you imagine the author intended.

CRITERIA: ${criteria} — ${CRITERIA_GUIDANCE[criteria]}
TARGET: ${target} — ${TARGET_GUIDANCE[target]}

PROMPT TO GRADE:
"""
${rawInput}
"""

Score three dimensions, each an integer from 0 to 100:
- "clarity" (Linguistic Clarity): are the instructions unambiguous — no vague pronouns or adjectives, no conflicting directives, a clearly stated goal?
- "precision" (Constraint Precision): are there explicit constraints — output format/schema, length or numeric bounds, negative constraints ("do not…"), and fallback behavior — as far as the criteria above demand them?
- "density" (Contextual Signal Density): what share of the prompt is useful task, domain, and context information versus filler, pleasantries, and redundancy?

Use the full range honestly: a one-line vague request should land well under 50; only a prompt with explicit role, task, constraints, and output format should exceed 85. Each "rationale" is 1–2 sentences that cite something concrete from the prompt.

Then give 2–4 "recommendations", most impactful first. Each must be a specific, actionable change to THIS prompt (not generic advice), with a "priority" of "high", "medium", or "low". If the prompt is already excellent, return fewer recommendations rather than inventing weak ones.

Respond with ONLY a single JSON object, no markdown fences, no commentary, matching exactly this shape:
{
  "clarity": { "score": 0, "rationale": "..." },
  "precision": { "score": 0, "rationale": "..." },
  "density": { "score": 0, "rationale": "..." },
  "recommendations": [
    { "priority": "high" | "medium" | "low", "title": "short title", "detail": "1–2 sentences describing exactly what to change" }
  ]
}`;
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return candidate;
  return candidate.slice(start, end + 1);
}

function parseDimension(raw: unknown): DimensionScore | null {
  if (typeof raw !== "object" || raw === null) return null;
  const d = raw as Record<string, unknown>;
  const score = typeof d.score === "string" ? Number(d.score) : d.score;
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  if (typeof d.rationale !== "string" || !d.rationale.trim()) return null;
  return { score: Math.min(100, Math.max(0, Math.round(score))), rationale: d.rationale.trim() };
}

function parseReport(text: string): IntelligenceReport | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  const clarity = parseDimension(obj.clarity);
  const precision = parseDimension(obj.precision);
  const density = parseDimension(obj.density);
  if (!clarity || !precision || !density) return null;

  const recommendations: ScoreRecommendation[] = [];
  if (Array.isArray(obj.recommendations)) {
    for (const raw of obj.recommendations) {
      if (typeof raw !== "object" || raw === null) continue;
      const r = raw as Record<string, unknown>;
      if (typeof r.title !== "string" || typeof r.detail !== "string") continue;
      recommendations.push({
        priority: r.priority === "high" || r.priority === "low" ? r.priority : "medium",
        title: r.title,
        detail: r.detail,
      });
    }
  }

  return { clarity, precision, density, recommendations };
}

export async function POST(req: Request) {
  try {
    const subject = await getRequestSubject(req);
    const { subjectKey, isAuthenticated } = subject;
    const limit = await getIntelligenceScoreLimit(subject);

    if (await hasReachedDailyLimit(subjectKey, TOOL, limit)) {
      return NextResponse.json(
        { error: `You've used your ${limit} free scores for today. Please try again tomorrow.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const rawInput = body?.input;
    const criteria = body?.criteria;
    const target = body?.target;

    if (typeof rawInput !== "string" || !rawInput.trim()) {
      return NextResponse.json({ error: "Paste a prompt to score." }, { status: 400 });
    }
    if (!isScoringCriteria(criteria)) {
      return NextResponse.json({ error: "Invalid scoring criteria." }, { status: 400 });
    }
    if (!isTargetModel(target)) {
      return NextResponse.json({ error: "Invalid target model." }, { status: 400 });
    }

    const trimmedInput = rawInput.trim();

    let report: IntelligenceReport | null = null;
    try {
      const chain = await buildTextGenerationChain();
      const attempt = await generateWithFallback(chain, buildScorePrompt(trimmedInput, criteria, target), TOOL);
      report = parseReport(attempt.text);

      if (!report) {
        // The model didn't return clean JSON — one retry with a sharper reminder.
        const retry = await generateWithFallback(
          chain,
          `${buildScorePrompt(trimmedInput, criteria, target)}\n\nReturn ONLY the raw JSON object. No markdown fences, no leading or trailing text.`,
          TOOL
        );
        report = parseReport(retry.text);
      }
    } catch (error) {
      if (error instanceof NoApiKeysConfiguredError) {
        return NextResponse.json({ error: "AI service is not configured. Please contact support." }, { status: 500 });
      }
      throw error;
    }

    if (!report) {
      return NextResponse.json({ error: "The AI did not return a usable result. Please try again." }, { status: 502 });
    }

    await consumeDailyLimit(subjectKey, TOOL);
    const used = await getUsedToday(subjectKey, TOOL);

    // The overall score is derived server-side from the dimension scores, never taken from the model.
    const overallScore = computeOverallScore(report);
    const scoreResult = {
      overallScore,
      tier: getScoreTier(overallScore),
      clarity: report.clarity,
      precision: report.precision,
      density: report.density,
      recommendations: report.recommendations,
    };
    await saveToolRun({
      userId: subject.userId,
      tool: TOOL,
      title: titleFrom(rawInput),
      input: { input: rawInput.trim(), criteria, target },
      result: scoreResult,
      historyId: body?.historyId,
    });

    return NextResponse.json({
      ...scoreResult,
      isAuthenticated,
      promptsRemaining: Math.max(0, limit - used),
      promptsLimit: limit,
    });
  } catch (error) {
    console.error("Intelligence Score error:", error);
    void reportError(error, { source: "api", route: "/api/tools/intelligence-score" });
    if (isGenAITimeout(error)) {
      return NextResponse.json(
        { error: "The AI is taking too long to respond. Please try again." },
        { status: 504 }
      );
    }
    if (isRetryableProviderError(error) || isRequestTooLargeForProvider(error) || error instanceof AllProvidersExhaustedError) {
      return NextResponse.json({ error: HIGH_DEMAND_MESSAGE }, { status: 429 });
    }
    return NextResponse.json({ error: "Something went wrong while scoring your prompt." }, { status: 500 });
  }
}
