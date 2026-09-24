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

const STRUCTURE_RULES = `Page structure — one subsection per section, in top-to-bottom order (use the roles given: Header, Hero, then the middle sections by their content, Footer). For each state: the container (background, padding, max width), the layout (columns, column widths, alignment, gaps), the contents in reading order with their exact sizes / weights / colours, the component styling (buttons, cards, badges, links, icons: fill, border, radius, padding, shadow, blur), and any decoration (glow, grid pattern, rings, floating elements) with its colours and opacity. Keep repeated items as "N items, each: ..." rather than listing them all.`;

const TECH_RULE = `Tech & theme (from tech in the tokens): build with the detected stack (only what "tech" lists — never technologies merely mentioned in the page text) — express styling in the detected CSS framework's own classes/components (e.g. Tailwind utilities, Bootstrap classes), use the detected UI library, icon set and animation library, and load fonts from the detected provider (if the fonts note says no web font is loaded, name the font family and recommend loading it from Google Fonts). Explain how light/dark works (mechanism, toggle) and give BOTH palettes: the current theme's colours and the alternate theme's background / text / heading hex values when present. Mention the responsive breakpoints when given.`;

const COPY_RULE = `The reference site's real text, brand name and images appear in the data only to show hierarchy and length. Do NOT copy its wording, brand or image subjects — describe placeholder content of the same length and role that suits the user's goal (or neutral placeholder text when no goal is given).`;

export const TARGET_GUIDANCE: Record<Target, string> = {
  "UI Builder (v0, Bolt, Lovable)": `Write ONE prompt the user pastes into an AI UI builder to rebuild this page's look AND structure. Use short headed sections: (1) Overview — the theme (light/dark), overall vibe, and the tech to use (React + Tailwind); (2) Design tokens — colours with hex and role, typography scale, spacing base, radii, shadows, effects; (3) ${STRUCTURE_RULES} (4) Tech & theme — ${TECH_RULE} (5) Notes on hover/responsive behaviour only where the data shows evidence. Use exact values from the data. Aim for roughly 900-1400 words: dense and specific, no filler, no repetition. ${COPY_RULE}`,
  "Code Assistant (Claude, ChatGPT)": `Write a detailed implementation brief for a coding assistant, formatted as clean Markdown with "##" headings, in exactly this order: (1) "## Overview" — the theme, the vibe and what to build; (2) "## Tech & theme" — ${TECH_RULE} (3) "## Page structure" — ${STRUCTURE_RULES} (4) LAST, "## Design tokens (CSS)" — one fenced \`\`\`css block containing a :root custom-properties block with every colour, font, radius, spacing and shadow token from the data (plus the alternate theme's colours in its own selector when given). Do NOT put any code before the Overview. Use exact values only. Aim for roughly 900-1400 words: dense and specific, no filler, no repetition. ${COPY_RULE}`,
  "Image Generator (Midjourney)": `Write a single descriptive image prompt (3-5 sentences) for a UI screenshot of this design. Describe the composition using the Header and Hero sections (nav shape, headline treatment, two-column arrangement, floating cards, background glow/grid), whether the theme is light or dark, the colour palette (name colours and include 3-4 hex codes), typography feel, shape language and lighting. End with Midjourney parameters: --ar 16:10 --style raw --v 7.`,
  "Image Generator (FLUX, SDXL)": `Write a single natural-language image prompt (4-6 sentences) for a UI mockup of this design. Describe the composition using the Header and Hero sections (nav shape, headline treatment, column arrangement, floating cards, background glow/grid), the colour palette with hex codes, typography feel, shape language, shadows and lighting. No parameters or flags.`,
};

export const MAX_URL_LENGTH = 2048;
export const MAX_GOAL_LENGTH = 400;
