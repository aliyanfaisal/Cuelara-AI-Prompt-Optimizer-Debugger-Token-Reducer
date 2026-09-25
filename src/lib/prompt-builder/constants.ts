export const BUILDER_TARGETS = ["Any AI model", "ChatGPT", "Claude", "Gemini", "Grok", "DeepSeek", "Cursor / Windsurf", "GitHub Copilot"] as const;
export const BUILDER_USE_CASES = ["General", "Coding", "Writing", "Marketing", "Business", "Research"] as const;
export const BUILDER_DETAIL_LEVELS = ["Concise", "Balanced", "Detailed"] as const;

export type BuilderTarget = (typeof BUILDER_TARGETS)[number];
export type BuilderUseCase = (typeof BUILDER_USE_CASES)[number];
export type BuilderDetail = (typeof BUILDER_DETAIL_LEVELS)[number];

/** An idea is a sentence or a few paragraphs, not a document — the cap keeps free-tier context windows safe. */
export const MAX_IDEA_CHARS = 4000;

export const isBuilderTarget = (v: unknown): v is BuilderTarget => typeof v === "string" && (BUILDER_TARGETS as readonly string[]).includes(v);
export const isBuilderUseCase = (v: unknown): v is BuilderUseCase => typeof v === "string" && (BUILDER_USE_CASES as readonly string[]).includes(v);
export const isBuilderDetail = (v: unknown): v is BuilderDetail => typeof v === "string" && (BUILDER_DETAIL_LEVELS as readonly string[]).includes(v);

export const TARGET_GUIDANCE: Record<BuilderTarget, string> = {
  "Any AI model": "Write it model-agnostic: clean Markdown section headers and bullet lists that any chat model reads well.",
  ChatGPT: "Write for ChatGPT: clear Markdown sections, explicit numbered steps where order matters, and an explicit output format.",
  Claude: "Write for Claude: wrap each section in descriptive XML tags (e.g. <role>, <task>, <requirements>, <output_format>), which Claude is trained to follow closely.",
  Gemini: "Write for Gemini: clear Markdown sections, concrete constraints, and an explicit output format; put the most important instruction first.",
  Grok: "Write for Grok: direct, plain Markdown sections with concrete constraints and an explicit output format.",
  DeepSeek: "Write for DeepSeek: state the task and constraints plainly and ask for the final answer format explicitly; avoid unnecessary role-play framing.",
  "Cursor / Windsurf": "Write for an AI coding editor: state the goal, the scope (what may and may not change), acceptance criteria, and how to verify the result. Do not assume a language, framework or file layout the idea does not mention.",
  "GitHub Copilot": "Write for GitHub Copilot Chat: a focused, single-goal request with the relevant context, constraints and the expected shape of the code or answer. Do not assume a language or framework the idea does not mention.",
};

export const USE_CASE_GUIDANCE: Record<BuilderUseCase, string> = {
  General: "No specialised domain — choose the sections that fit the idea.",
  Coding: "Software work: cover the goal, inputs and outputs, constraints, edge cases worth handling, and the expected code/output format — only what the idea implies.",
  Writing: "Writing work: cover the audience, purpose, tone, length and format — only what the idea implies.",
  Marketing: "Marketing work: cover the audience, offer, channel, tone, call to action and length — only what the idea implies.",
  Business: "Business work: cover the objective, context, audience, decision or deliverable, and format — only what the idea implies.",
  Research: "Research work: cover the question, scope, depth, source expectations, and how findings should be structured — only what the idea implies.",
};

export const DETAIL_GUIDANCE: Record<BuilderDetail, string> = {
  Concise: "Keep it as short as it can be while remaining unambiguous — a few tight lines or one short block.",
  Balanced: "A moderate prompt: enough structure to be unambiguous, with no padding.",
  Detailed: "A thorough prompt with every section the idea supports, each stated precisely — thorough, never padded or repetitive.",
};
