import { prisma } from "@/lib/prisma";
import type { RequestSubject } from "@/lib/rate-limit";
import { getContextExtractorLimits } from "@/lib/rag/limits";
import { getIntelligenceScoreLimit } from "@/lib/intelligence-score/limits";
import { getPromptBuilderLimit } from "@/lib/prompt-builder/limits";
import { getPromptDebuggerLimit } from "@/lib/prompt-debugger/limits";
import { getPromptFormatterLimit } from "@/lib/prompt-formatter/limits";
import { getPromptOptimizerLimit } from "@/lib/prompt-optimizer/limits";
import { getSiteToPromptLimits } from "@/lib/site-to-prompt/limits";
import { getTokenOptimizerLimit } from "@/lib/token-optimizer/limits";

export interface ToolDailyUsage {
  /** The id ToolUsageDaily and plan limits use for this quota (see src/lib/plan-tools.ts). */
  id: string;
  label: string;
  used: number;
  limit: number;
}

/** Today's (UTC) usage against the daily limit for every quota-limited tool, for this subject. */
export async function getSubjectDailyUsage(subject: RequestSubject): Promise<ToolDailyUsage[]> {
  const date = new Date().toISOString().slice(0, 10);

  const [rows, builder, optimizer, token, debug, format, score, site, extractor] = await Promise.all([
    prisma.toolUsageDaily.findMany({ where: { subjectKey: subject.subjectKey, date }, select: { tool: true, count: true } }),
    getPromptBuilderLimit(subject),
    getPromptOptimizerLimit(subject),
    getTokenOptimizerLimit(subject),
    getPromptDebuggerLimit(subject),
    getPromptFormatterLimit(subject),
    getIntelligenceScoreLimit(subject),
    getSiteToPromptLimits(subject),
    getContextExtractorLimits(subject),
  ]);
  const used = new Map(rows.map((r) => [r.tool, r.count]));

  const quotas: [string, string, number][] = [
    ["prompt-builder", "Prompt Builder", builder],
    ["prompt-optimizer", "Prompt Optimizer", optimizer],
    ["token-optimizer", "Token Optimizer", token],
    ["prompt-debugger", "Prompt Debugger", debug],
    ["prompt-formatter", "Prompt Formatter", format],
    ["intelligence-score", "Intelligence Score", score],
    ["site-to-prompt", "Site to Prompt", site.promptLimit],
    ["context-extractor-document", "Context Extractor (documents)", extractor.documentLimit],
    ["context-extractor-prompt", "Context Extractor (prompts)", extractor.promptLimit],
  ];
  return quotas.map(([id, label, limit]) => ({ id, label, used: used.get(id) ?? 0, limit }));
}
