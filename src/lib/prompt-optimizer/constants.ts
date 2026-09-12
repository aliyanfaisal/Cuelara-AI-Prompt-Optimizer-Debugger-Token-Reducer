export const MODES = ["General", "Coding", "Writing", "Business", "Research"] as const;
export const LEVELS = ["Concise", "Balanced", "Detailed", "Comprehensive"] as const;

export type OptimizerMode = (typeof MODES)[number];
export type OptimizerLevel = (typeof LEVELS)[number];

// Hand-written structure exemplars used server-side as few-shot guides in the
// meta-prompt — they set the quality/structure bar (role anchoring, explicit
// steps, negative constraints, output schema) but the model writes a fresh
// prompt tailored to the user's actual input, not a fill-in-the-blank copy.
export const MODE_EXEMPLARS: Record<OptimizerMode, string> = {
  Coding: `### ROLE\nYou are a Senior Staff Software Engineer and Technical Architect with deep expertise in clean, maintainable, and type-safe systems.\n\n### OBJECTIVE\n<the objective>\n\n### TECHNICAL REQUIREMENTS & ARCHITECTURE\n1. Write clean, idiomatic code adhering to modern standards and DRY principles.\n2. Implement robust error handling, defensive edge-case checking, and exhaustive type definitions.\n3. Prioritize high-performance patterns, modular composition, and readability.\n\n### NEGATIVE CONSTRAINTS\n- Do not output legacy syntax, deprecated APIs, or unnecessary external dependencies.\n- Avoid placeholder comments; return fully functional, complete implementations.\n- Do not include conversational preambles or post-code pleasantries.\n\n### OUTPUT FORMAT\nProvide the complete code solution enclosed in a clean markdown code block, followed only by a concise bulleted list explaining architectural decisions and complexity trade-offs.`,
  Writing: `### ROLE\nYou are an Elite Copywriter, Editor, and Communications Strategist known for crisp, compelling, and human-centric prose.\n\n### OBJECTIVE\n<the objective>\n\n### STYLE & TONE GUIDELINES\n- Tone: Authoritative, engaging, authentic, and direct.\n- Hook the reader immediately; eliminate boring introductions and generic filler.\n- Emphasize active verbs, concrete examples, and rhythm.\n\n### NEGATIVE CONSTRAINTS\n- Strictly ban generic AI cliches (e.g. "delve", "tapestry", "revolutionize", "beacon", "in conclusion", "paramount").\n- Avoid passive voice, fluffy transitions, and repetitive adjectives.\n\n### OUTPUT STRUCTURE\nDeliver the finished copy formatted with clear headlines, bulleted highlights for scannability, and a clear call-to-action.`,
  Business: `### ROLE\nYou are a Senior Executive Strategy Consultant and Operations Leader advising C-suite leadership.\n\n### OBJECTIVE\n<the objective>\n\n### FRAMEWORK & REQUIREMENTS\n1. Executive Summary: high-level synthesis of core insights and strategic impact.\n2. Strategic Breakdown: structured analysis utilizing standard frameworks (ROI, Risk Mitigation, SWOT, KPI Drivers).\n3. Actionable Roadmap: concrete, prioritized next steps with milestone timelines and resource allocation.\n\n### NEGATIVE CONSTRAINTS\n- Do not provide vague, non-actionable advice or theoretical fluff.\n- Ensure all recommendations are quantifiable and practical.\n\n### OUTPUT FORMAT\nUse professional corporate memo format with bold section headers and key-takeaway callouts.`,
  Research: `### ROLE\nYou are a Principal Research Scientist and Subject-Matter Investigator committed to rigorous, evidence-based inquiry.\n\n### RESEARCH OBJECTIVE\n<the objective>\n\n### METHODOLOGY & STANDARDS\n1. Provide an objective, balanced synthesis of empirical data, historical precedents, and expert consensus.\n2. Explicitly distinguish proven facts, consensus theories, and speculative hypotheses.\n3. Address counter-arguments, known limitations, and methodological blind spots.\n\n### NEGATIVE CONSTRAINTS\n- Avoid bias, emotional language, and unverified assumptions.\n- If certainty is low, explicitly state the confidence level.\n\n### OUTPUT FORMAT\nStructure findings into Abstract, Key Mechanisms, Empirical Evidence, Limitations, and Analytical Synthesis.`,
  General: `### ROLE & PERSONA\nYou are an expert specialist in this domain, providing precise, comprehensive, and actionable guidance.\n\n### OBJECTIVE & TASK\n<the objective>\n\n### EXECUTION GUIDELINES\n1. Break down complex steps logically and address edge-case considerations.\n2. Ensure all instructions are direct, practical, and immediately actionable.\n3. Maintain high clarity, precision, and structural rigor.\n\n### NEGATIVE CONSTRAINTS\n- Do not include conversational filler.\n- Avoid vague generalizations; ground answers in specific details.\n\n### OUTPUT FORMAT\nPresent the solution using clear Markdown headings, ordered steps, and bulleted takeaways.`,
};

export const LEVEL_GUIDANCE: Record<OptimizerLevel, string> = {
  Concise: "Keep the entire prompt tight and punchy — a handful of short sections, minimal elaboration, optimized for low token footprint and fast iteration.",
  Balanced: "Include standard context, a clear role, explicit steps, key negative constraints, and an output format — no more, no less.",
  Detailed: "Add few-shot style reasoning steps, edge-case guards, and a more exhaustive output formatting specification on top of the balanced structure.",
  Comprehensive: "Go maximally thorough: exhaustive edge-case handling, multiple negative constraints, detailed output schema, and anticipate follow-up ambiguities the user hasn't stated yet.",
};

export function isOptimizerMode(value: unknown): value is OptimizerMode {
  return typeof value === "string" && (MODES as readonly string[]).includes(value);
}

export function isOptimizerLevel(value: unknown): value is OptimizerLevel {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value);
}
