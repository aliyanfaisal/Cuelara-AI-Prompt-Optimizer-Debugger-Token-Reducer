import { NextResponse } from "next/server";
import { getRequestSubject, hasReachedDailyLimit, consumeDailyLimit, getUsedToday } from "@/lib/rate-limit";
import { isGenAITimeout } from "@/lib/genai-timeout";
import { getPromptDebuggerLimit } from "@/lib/prompt-debugger/limits";
import {
  isStrictnessLevel,
  isFocusArea,
  STRICTNESS_GUIDANCE,
  FOCUS_GUIDANCE,
  type StrictnessLevel,
  type FocusArea,
  type DebuggerReport,
  type DebuggerIssue,
  type DebuggerPassedCheck,
} from "@/lib/prompt-debugger/constants";
import { NoApiKeysConfiguredError, isRetryableProviderError, isRequestTooLargeForProvider } from "@/lib/api-keys";
import { generateWithFallback, AllProvidersExhaustedError } from "@/lib/llm-generate";
import { buildTextGenerationChain } from "@/lib/model-chain";
import { HIGH_DEMAND_MESSAGE } from "@/lib/error-messages";
import { saveToolRun, titleFrom } from "@/lib/history";

const TOOL = "prompt-debugger";

function buildAuditPrompt(rawInput: string, level: StrictnessLevel, focus: FocusArea): string {
  return `You are an expert prompt engineer auditing a prompt for weaknesses that would cause an LLM to fail silently — producing wrong formatting, hallucinations, or ignored constraints instead of an error.

STRICTNESS: ${level} — ${STRICTNESS_GUIDANCE[level]}
FOCUS: ${focus} — ${FOCUS_GUIDANCE[focus]}

PROMPT TO AUDIT:
"""
${rawInput}
"""

Find genuine issues only — never invent a problem to pad the list, and never flag something the prompt already handles correctly. If the prompt has no real issues at the requested strictness/focus, return an empty "issues" array.

For each issue found, the "fix" field must be a short, standalone instruction (one sentence, imperative) that resolves that exact issue — specific enough to paste on its own, but written so it would also read naturally if merged directly into the prompt's existing wording rather than bolted on as a separate sentence.

For each check that genuinely passes (relevant to the requested focus), include one entry in "passedChecks" describing what was verified clean.

Respond with ONLY a single JSON object, no markdown fences, no commentary, matching exactly this shape:
{
  "issues": [
    { "id": "kebab-case-slug", "severity": "critical" | "warning", "title": "short title", "explanation": "1-2 sentences on what goes wrong and why", "fix": "the exact sentence to append to the prompt" }
  ],
  "passedChecks": [
    { "title": "short title", "detail": "1 sentence on what was verified" }
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

function parseReport(text: string): DebuggerReport | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.issues) || !Array.isArray(obj.passedChecks)) return null;

  const issues: DebuggerIssue[] = [];
  for (const raw of obj.issues) {
    if (typeof raw !== "object" || raw === null) continue;
    const i = raw as Record<string, unknown>;
    if (typeof i.title !== "string" || typeof i.explanation !== "string" || typeof i.fix !== "string") continue;
    issues.push({
      id: typeof i.id === "string" && i.id ? i.id : i.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60),
      severity: i.severity === "critical" ? "critical" : "warning",
      title: i.title,
      explanation: i.explanation,
      fix: i.fix,
    });
  }

  const passedChecks: DebuggerPassedCheck[] = [];
  for (const raw of obj.passedChecks) {
    if (typeof raw !== "object" || raw === null) continue;
    const p = raw as Record<string, unknown>;
    if (typeof p.title !== "string" || typeof p.detail !== "string") continue;
    passedChecks.push({ title: p.title, detail: p.detail });
  }

  return { issues, passedChecks };
}

export async function POST(req: Request) {
  try {
    const subject = await getRequestSubject(req);
    const { subjectKey, isAuthenticated } = subject;
    const limit = await getPromptDebuggerLimit(subject);

    if (await hasReachedDailyLimit(subjectKey, TOOL, limit)) {
      return NextResponse.json(
        { error: `You've used your ${limit} free audits for today. Please try again tomorrow.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const rawInput = body?.input;
    const level = body?.level;
    const focus = body?.focus;

    if (typeof rawInput !== "string" || !rawInput.trim()) {
      return NextResponse.json({ error: "Paste a prompt to audit." }, { status: 400 });
    }
    if (!isStrictnessLevel(level)) {
      return NextResponse.json({ error: "Invalid strictness level." }, { status: 400 });
    }
    if (!isFocusArea(focus)) {
      return NextResponse.json({ error: "Invalid focus area." }, { status: 400 });
    }

    const trimmedInput = rawInput.trim();

    let report: DebuggerReport | null = null;
    try {
      const chain = await buildTextGenerationChain();
      const attempt = await generateWithFallback(chain, buildAuditPrompt(trimmedInput, level, focus), TOOL);
      report = parseReport(attempt.text);

      if (!report) {
        // The model didn't return clean JSON — one retry with a sharper reminder.
        const retry = await generateWithFallback(
          chain,
          `${buildAuditPrompt(trimmedInput, level, focus)}\n\nReturn ONLY the raw JSON object. No markdown fences, no leading or trailing text.`,
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
    await saveToolRun({
      userId: subject.userId,
      tool: TOOL,
      title: titleFrom(rawInput),
      input: { input: rawInput.trim(), level, focus },
      result: { issues: report.issues, passedChecks: report.passedChecks },
      historyId: body?.historyId,
    });
    const used = await getUsedToday(subjectKey, TOOL);

    return NextResponse.json({
      issues: report.issues,
      passedChecks: report.passedChecks,
      isAuthenticated,
      promptsRemaining: Math.max(0, limit - used),
      promptsLimit: limit,
    });
  } catch (error) {
    console.error("Prompt Debugger error:", error);
    if (isGenAITimeout(error)) {
      return NextResponse.json(
        { error: "The AI is taking too long to respond. Please try again." },
        { status: 504 }
      );
    }
    if (isRetryableProviderError(error) || isRequestTooLargeForProvider(error) || error instanceof AllProvidersExhaustedError) {
      return NextResponse.json({ error: HIGH_DEMAND_MESSAGE }, { status: 429 });
    }
    return NextResponse.json({ error: "Something went wrong while auditing your prompt." }, { status: 500 });
  }
}
