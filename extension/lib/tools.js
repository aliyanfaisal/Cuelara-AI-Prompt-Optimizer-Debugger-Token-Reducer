// The text tools the popup and the field widget can run, and how each maps onto the REST API (/api/v1/*).
// `usageId` is the tool's id in the usage/limits returned by /api/extension/me.
export const TEXT_TOOLS = [
  {
    id: "optimize",
    name: "Optimize",
    usageId: "prompt-optimizer",
    path: "/api/v1/optimize-prompt",
    purpose: "Turns a rough request into a complete, structured prompt with a role, steps and an output format.",
    page: "/tools/prompt-optimizer",
    body: (text) => ({ text, mode: "General", level: "Balanced" }),
    output: (res) => res.optimized,
  },
  {
    id: "build",
    name: "Build",
    usageId: "prompt-builder",
    path: "/api/v1/build-prompt",
    purpose: "Builds a ready-to-paste prompt from a short idea, tuned for the AI model you will use it with.",
    page: "/tools/prompt-builder",
    body: (text) => ({ idea: text }),
    output: (res) => res.prompt,
  },
  {
    id: "compress",
    name: "Compress",
    usageId: "token-optimizer",
    path: "/api/v1/compress-prompt",
    purpose: "Shortens a wordy prompt to use fewer tokens while keeping its meaning, checked with a real tokenizer.",
    page: "/tools/token-optimizer",
    body: (text) => ({ text, level: "Balanced" }),
    output: (res) => res.compressed,
    note: (res) => (res.originalTokens ? `${res.originalTokens} → ${res.compressedTokens} tokens (${res.savedPercent}% fewer)` : ""),
  },
  {
    id: "format",
    name: "Format",
    usageId: "prompt-formatter",
    path: "/api/v1/format-prompt",
    purpose: "Reorganizes a messy prompt into clean sections: role, task, constraints and output format.",
    page: "/tools/prompt-formatter",
    body: (text) => ({ text, format: "Markdown (Standard)" }),
    output: (res) => res.formatted,
  },
  {
    id: "debug",
    name: "Debug",
    usageId: "prompt-debugger",
    path: "/api/v1/debug-prompt",
    purpose: "Finds contradictions, gaps and ambiguity that make an AI fail silently, then rewrites the prompt with the fixes.",
    page: "/tools/prompt-debugger",
    body: (text) => ({ text, applyFixes: true }),
    output: (res) => res.fixed,
    note: (res) => {
      const n = Array.isArray(res.issues) ? res.issues.length : 0;
      return n === 0 ? "No issues found" : `Fixed ${n} issue${n === 1 ? "" : "s"}`;
    },
  },
];

export function toolById(id) {
  return TEXT_TOOLS.find((t) => t.id === id) || null;
}
