import type { Prisma } from "@/generated/client/client";
import { prisma } from "@/lib/prisma";

/** The tools that record history. `id` is the tool's URL slug (/tools/<id>) and what ToolRun.tool holds. */
export const HISTORY_TOOLS = [
  { id: "prompt-optimizer", label: "Prompt Optimizer" },
  { id: "context-extractor", label: "Context Extractor" },
  { id: "site-to-prompt", label: "Site to Prompt" },
  { id: "token-optimizer", label: "Token Optimizer" },
  { id: "prompt-debugger", label: "Prompt Debugger" },
  { id: "prompt-formatter", label: "Prompt Formatter" },
  { id: "intelligence-score", label: "Intelligence Score" },
  { id: "compare-estimate", label: "Diff & Cost Estimate" },
] as const;

export type HistoryToolId = (typeof HISTORY_TOOLS)[number]["id"];

export function isHistoryTool(value: unknown): value is HistoryToolId {
  return HISTORY_TOOLS.some((t) => t.id === value);
}

export function historyToolLabel(id: string): string {
  return HISTORY_TOOLS.find((t) => t.id === id)?.label ?? id;
}

/** A run larger than this (input + result as JSON) is not saved: the tool still works, it just isn't in history. */
const MAX_RUN_BYTES = 1_000_000;
/** Oldest runs beyond this many per tool are dropped, so history can't grow without bound. */
export const MAX_RUNS_PER_TOOL = 200;

/** One-line label for a history row, cut from the start of whatever the user typed. */
export function titleFrom(text: string, fallback = "Untitled run"): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  return clean.length > 90 ? `${clean.slice(0, 90).trimEnd()}…` : clean;
}

export interface SaveToolRunParams {
  /** null for anonymous visitors: their runs are never saved. */
  userId: string | null;
  tool: HistoryToolId;
  title: string;
  input: unknown;
  result: unknown;
  /** When set (a run reopened from history and submitted again), that run is updated instead of a new one added. */
  historyId?: unknown;
}

/**
 * Records a run for a signed-in user. Best effort: a history problem must never fail the tool call that
 * just did its (paid) work, so this never throws. Returns the run's id, or null if nothing was saved.
 */
export async function saveToolRun({ userId, tool, title, input, result, historyId }: SaveToolRunParams): Promise<string | null> {
  if (!userId) return null;

  try {
    // Round-tripping through JSON drops undefined fields and gives Prisma plain JSON values.
    const inputJson = JSON.stringify(input);
    const resultJson = JSON.stringify(result);
    if (inputJson.length + resultJson.length > MAX_RUN_BYTES) {
      console.warn(`History: run for ${tool} is too large to save, skipping.`);
      return null;
    }
    input = JSON.parse(inputJson) as Prisma.InputJsonValue;
    result = JSON.parse(resultJson) as Prisma.InputJsonValue;

    if (typeof historyId === "string" && historyId) {
      // updateMany scopes the write to the caller's own run of this tool: a foreign or stale id updates nothing.
      const updated = await prisma.toolRun.updateMany({ where: { id: historyId, userId, tool }, data: { title, input: input as Prisma.InputJsonValue, result: result as Prisma.InputJsonValue } });
      if (updated.count > 0) return historyId;
    }

    const created = await prisma.toolRun.create({ data: { userId, tool, title, input: input as Prisma.InputJsonValue, result: result as Prisma.InputJsonValue }, select: { id: true } });

    const stale = await prisma.toolRun.findMany({
      where: { userId, tool },
      orderBy: { updatedAt: "desc" },
      skip: MAX_RUNS_PER_TOOL,
      select: { id: true },
    });
    if (stale.length > 0) await prisma.toolRun.deleteMany({ where: { id: { in: stale.map((r) => r.id) } } });

    return created.id;
  } catch (error) {
    console.error("History: could not save run:", error);
    return null;
  }
}

/** One of a user's own runs. Scoped to the owner, so someone else's id looks exactly like a missing one. */
export async function getRunForUser(id: string, userId: string) {
  return prisma.toolRun.findFirst({ where: { id, userId }, select: { id: true, tool: true, title: true, input: true, result: true } });
}
