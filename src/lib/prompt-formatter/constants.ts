export const FORMAT_STYLES = ["Markdown (Standard)", "XML (Claude-Optimized)", "JSON (API Ready)"] as const;
export const INDENT_SIZES = ["2 Spaces", "4 Spaces", "Tabs"] as const;

export type FormatStyle = (typeof FORMAT_STYLES)[number];
export type IndentSize = (typeof INDENT_SIZES)[number];

export function isFormatStyle(value: unknown): value is FormatStyle {
  return typeof value === "string" && (FORMAT_STYLES as readonly string[]).includes(value);
}

export function isIndentSize(value: unknown): value is IndentSize {
  return typeof value === "string" && (INDENT_SIZES as readonly string[]).includes(value);
}

export const FORMAT_GUIDANCE: Record<FormatStyle, string> = {
  "Markdown (Standard)":
    "Output clean Markdown using `###` section headers (e.g. ### System Role, ### Task, ### Constraints, ### Output Format) and bullet points for lists. No XML tags, no JSON.",
  "XML (Claude-Optimized)":
    "Output nested XML tags (e.g. <system>, <task>, <constraints>, <output_format>) the way Anthropic's Claude models are trained to parse. Each section is its own tag pair. No Markdown headers, no JSON.",
  "JSON (API Ready)":
    "Output a single valid JSON object with keys like system_role, primary_task, constraints (an array), and output_format. No Markdown, no XML, no commentary outside the JSON.",
};

export function indentToSpaces(indent: IndentSize): number | "\t" {
  if (indent === "4 Spaces") return 4;
  if (indent === "Tabs") return "\t";
  return 2;
}
