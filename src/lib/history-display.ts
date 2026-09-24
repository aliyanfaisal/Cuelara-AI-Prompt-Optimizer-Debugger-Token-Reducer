import { historyToolLabel } from "@/lib/history";

const text = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");

/** The options a run was made with, as a short "a · b" line for its history row. */
export function describeRun(tool: string, input: unknown): string {
  const i = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const parts: string[] = (() => {
    switch (tool) {
      case "prompt-optimizer":
        return [text(i.mode), text(i.level)];
      case "token-optimizer":
        return [text(i.level), i.preserveFormatting === "Yes" ? "Keeps formatting" : ""];
      case "prompt-debugger":
        return [text(i.level), text(i.focus)];
      case "prompt-formatter":
        return [text(i.format), i.indent ? `${text(i.indent)} indent` : ""];
      case "intelligence-score":
        return [text(i.criteria), text(i.target)];
      case "site-to-prompt":
        return [i.target ? `For ${text(i.target)}` : "", text(i.goal)];
      case "context-extractor":
        return [i.sourceMode === "text" ? "Pasted text" : text(i.filename) || "Document", text(i.depth) === "top5" ? "Top 5" : "Top 3"];
      case "compare-estimate":
        return ["Prompt comparison"];
      default:
        return [historyToolLabel(tool)];
    }
  })();
  return parts.filter(Boolean).join(" · ");
}
