import { generateWithFallback } from "@/lib/llm-generate";
import { buildTextGenerationChain } from "@/lib/model-chain";
import {
  STRICTNESS_GUIDANCE,
  FOCUS_GUIDANCE,
  type StrictnessLevel,
  type FocusArea,
  type DebuggerReport,
  type DebuggerIssue,
  type DebuggerPassedCheck,
} from "@/lib/prompt-debugger/constants";

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

/**
 * Shared by the web tool (src/app/api/tools/prompt-debugger/route.ts) and the REST API
 * (src/app/api/v1/debug-prompt/route.ts). Returns null when the model never produced a usable report;
 * provider errors bubble to the caller.
 */
export async function auditPrompt(rawInput: string, level: StrictnessLevel, focus: FocusArea): Promise<DebuggerReport | null> {
  const input = rawInput.trim();
  const chain = await buildTextGenerationChain();
  const attempt = await generateWithFallback(chain, buildAuditPrompt(input, level, focus), TOOL);
  const report = parseReport(attempt.text);
  if (report) return report;

  // The model didn't return clean JSON — one retry with a sharper reminder.
  const retry = await generateWithFallback(
    chain,
    `${buildAuditPrompt(input, level, focus)}\n\nReturn ONLY the raw JSON object. No markdown fences, no leading or trailing text.`,
    TOOL
  );
  return parseReport(retry.text);
}

function buildRewritePrompt(rawInput: string, fixes: string[]): string {
  return `You are an expert prompt engineer. Rewrite the prompt below into one clean, coherent, production-ready prompt that fully incorporates every fix listed.

Do NOT just bolt the fixes on as a list of separate sentences at the end — integrate each one naturally into the prompt's existing structure and wording. Merge overlapping or related fixes into a single clause instead of repeating yourself, remove anything that becomes redundant once a fix is applied, and keep the result reading like one prompt a person would actually write, not a patchwork.

ORIGINAL PROMPT:
"""
${rawInput}
"""

FIXES TO INCORPORATE:
${fixes.map((fix) => `- ${fix}`).join("\n")}

Return only the rewritten prompt text — no meta-commentary, no explanation of what changed, no markdown fences.`;
}

/** Rewrites the prompt with every listed fix woven in. Shared by the web tool and the REST API. */
export async function applyFixes(rawInput: string, fixes: string[]): Promise<string> {
  const chain = await buildTextGenerationChain();
  const attempt = await generateWithFallback(chain, buildRewritePrompt(rawInput.trim(), fixes), TOOL);
  return attempt.text.trim();
}
