import { saveToolRun, titleFrom } from "@/lib/history";
import type { RankedChunk } from "@/lib/rag/similarity";

const MAX_RAW_TEXT_CHARS = 200_000;
const FORMAT_STYLES = ["markdown", "xml", "json"] as const;

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.slice(0, max) : "");

/**
 * The Context Extractor's result has display-only inputs the server never needs for retrieval (the task
 * wrapper, output format, where the text came from). The page sends them along as `history` so a saved run
 * can be reopened exactly as it looked. It's the user's own data going into their own history, so it is only
 * shape-checked and size-capped here, not trusted for anything else.
 */
export function sanitizeExtractorMeta(raw: unknown) {
  const m = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    sourceMode: m.sourceMode === "text" ? ("text" as const) : ("file" as const),
    filename: str(m.filename, 300),
    fileSize: str(m.fileSize, 40),
    rawText: str(m.rawText, MAX_RAW_TEXT_CHARS),
    aiTask: str(m.aiTask, 5000),
    formatStyle: FORMAT_STYLES.find((f) => f === m.formatStyle) ?? "markdown",
    wantsPrompt: m.wantsPrompt !== false,
    historyId: typeof m.historyId === "string" ? m.historyId : undefined,
  };
}

export async function saveExtractorRun(params: {
  userId: string | null;
  meta: ReturnType<typeof sanitizeExtractorMeta>;
  searchQuery: string;
  depth: string;
  documentId: string;
  originalTokens: number;
  snippets: RankedChunk[];
}) {
  const { meta, searchQuery, depth, documentId, originalTokens, snippets } = params;
  return saveToolRun({
    userId: params.userId,
    tool: "context-extractor",
    title: titleFrom(searchQuery),
    input: { ...meta, historyId: undefined, searchQuery, depth, documentId },
    result: { snippets, originalTokens },
    historyId: meta.historyId,
  });
}
