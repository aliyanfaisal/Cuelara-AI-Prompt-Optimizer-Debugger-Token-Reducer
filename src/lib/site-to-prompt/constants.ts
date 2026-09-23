export const EXTRACT_TOOL = "site-to-prompt-extract";
export const PROMPT_TOOL = "site-to-prompt";

export const TARGETS = [
  "UI Builder (v0, Bolt, Lovable)",
  "Code Assistant (Claude, ChatGPT)",
  "Image Generator (Midjourney)",
  "Image Generator (FLUX, SDXL)",
] as const;
export type Target = (typeof TARGETS)[number];

export function isTarget(v: unknown): v is Target {
  return typeof v === "string" && (TARGETS as readonly string[]).includes(v);
}

export const TARGET_GUIDANCE: Record<Target, string> = {
  "UI Builder (v0, Bolt, Lovable)":
    "Write a build prompt for an AI UI builder. Structure it with short headed sections (Overview, Colors, Typography, Spacing & Shape, Layout, Components). Use the exact hex values, pixel sizes and font names from the design data, and express them as Tailwind-friendly tokens where natural. End with a one-line instruction to build the page in React + Tailwind.",
  "Code Assistant (Claude, ChatGPT)":
    "Write a detailed implementation brief for a coding assistant. Include a CSS custom-properties block (:root) containing every colour, font, radius, spacing and shadow token from the data, followed by concise guidance on layout and component styling. Use exact values only.",
  "Image Generator (Midjourney)":
    "Write a single descriptive image prompt (2-4 sentences) for a UI screenshot or mockup in this visual style. Describe mood, colour palette (name colours and include 2-3 hex codes), typography feel, shape language and lighting. End with Midjourney parameters: --ar 16:10 --style raw --v 7.",
  "Image Generator (FLUX, SDXL)":
    "Write a single natural-language image prompt (3-5 sentences) for a UI mockup in this visual style. Describe layout, colour palette with hex codes, typography feel, shape language, shadows and lighting. No parameters or flags.",
};

export const MAX_URL_LENGTH = 2048;
export const MAX_GOAL_LENGTH = 400;
