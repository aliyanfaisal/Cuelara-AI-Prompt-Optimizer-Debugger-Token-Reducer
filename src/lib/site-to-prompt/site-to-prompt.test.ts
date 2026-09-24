import test from "node:test";
import assert from "node:assert/strict";
import { normalizeColor, parseColor, colorsInString, compositeOver } from "./color";
import { buildDesignDna } from "./aggregate";
import { summarizeSection } from "./summarize";
import { techSchema } from "./schema";
import { buildSitePrompt } from "./prompt";
import { TARGET_GUIDANCE } from "./constants";
import type { RawNode, RawPage, RawSample } from "./types";

test("normalizeColor handles rgb, rgba, space syntax and transparency", () => {
  assert.equal(normalizeColor("rgb(37, 99, 235)"), "#2563EB");
  assert.equal(normalizeColor("rgba(37, 99, 235, 0.5)"), "#2563EB");
  assert.equal(normalizeColor("rgb(37 99 235 / 50%)"), "#2563EB");
  assert.equal(normalizeColor("rgba(0, 0, 0, 0)"), null);
  assert.equal(normalizeColor("#fff"), "#FFFFFF");
});

function sample(over: Partial<RawSample>): RawSample {
  return {
    tag: "div", w: 200, h: 100, color: "rgb(17, 17, 17)", bg: "rgba(0, 0, 0, 0)", bgImage: "", fontFamily: "Inter, sans-serif",
    fontSize: 16, fontWeight: 400, lineHeight: 24, radius: 0, shadow: "", border: 0, padding: [0, 0, 0, 0], margin: [0, 0, 0, 0],
    gap: 0, display: "block", gridColumns: 0, maxWidth: 0, textLen: 0, children: 0, isButton: false, isLink: false, backdropBlur: false,
    ...over,
  };
}

test("buildDesignDna derives accent, fonts, spacing base and button style", () => {
  const button = { tag: "button", isButton: true, bg: "rgb(83, 58, 253)", color: "rgb(255, 255, 255)", radius: 8, padding: [12, 24, 12, 24], w: 140, h: 44, textLen: 8, fontWeight: 600 };
  const raw: RawPage = {
    title: "T", viewportWidth: 1440, pageBg: "rgb(255, 255, 255)", pageColor: "rgb(17, 17, 17)", themeColor: "", loadedFonts: ["Inter"], sections: [],
    samples: [
      sample({ tag: "h1", fontSize: 48, fontWeight: 700, textLen: 20, fontFamily: "Poppins, sans-serif" }),
      sample({ tag: "p", textLen: 400, padding: [16, 16, 16, 16] }),
      sample(button),
      sample(button),
      sample({ tag: "div", padding: [8, 8, 8, 8], gap: 24 }),
    ],
  };
  const dna = buildDesignDna(raw, "https://x.test/");
  assert.equal(dna.mode, "light");
  assert.equal(dna.colors.background, "#FFFFFF");
  assert.equal(dna.colors.accent, "#533AFD");
  assert.equal(dna.typography.headingFont, "Poppins");
  assert.equal(dna.typography.bodyFont, "Inter");
  assert.equal(dna.spacing.baseUnit, 8);
  assert.equal(dna.radii.button, 8);
  assert.equal(dna.components.button?.padding, "12px 24px");
  assert.equal(dna.typography.scale.find((s) => s.role === "h1")?.size, 48);
});

test("parseColor understands oklch/oklab as modern browsers report them", () => {
  // Tailwind zinc-950 and indigo-500 as computed by Chromium.
  assert.equal(normalizeColor("oklch(0.141 0.005 285.823)"), "#09090B");
  assert.equal(normalizeColor("oklch(0.585 0.233 277.117)"), "#615FFF");
  assert.equal(parseColor("oklab(0.21 0 0 / 0.9)")?.a, 0.9);
});

test("colorsInString and compositeOver read gradients and blend translucent layers", () => {
  const stops = colorsInString("radial-gradient(70% 50% at 50% 0px, rgba(99, 102, 241, 0.22), rgba(0, 0, 0, 0) 70%)");
  assert.deepEqual(stops, [{ hex: "#6366F1", alpha: 0.22 }]);
  // 5% white over near-black is still near-black, not white.
  assert.equal(compositeOver("#09090B", { r: 255, g: 255, b: 255, a: 0.05 }), "#151517");
});

test("buildDesignDna uses blended backgrounds, gradient text and pill radii", () => {
  const text = "rgb(255, 255, 255)";
  const raw: RawPage = {
    title: "Dark", viewportWidth: 1440, pageBg: "#09090B", pageColor: text, themeColor: "", loadedFonts: [], sections: [],
    samples: [
      sample({ tag: "h1", fontSize: 48, fontWeight: 700, textLen: 30, color: text }),
      sample({ tag: "span", fontSize: 48, textLen: 20, color: "rgba(0, 0, 0, 0)", textGradient: "linear-gradient(to right, #7C86FF 0%, #00D3F3 100%)", bgImage: "linear-gradient(to right, #7C86FF 0%, #00D3F3 100%)" }),
      sample({ tag: "a", isButton: true, isLink: true, textLen: 10, bg: "rgb(255, 255, 255)", bgResolved: "#FFFFFF", bgOwnAlpha: 1, color: "rgb(24, 24, 27)", radius: 9999, w: 160, h: 48 }),
      sample({ tag: "p", textLen: 300, color: "rgb(159, 159, 169)" }),
      sample({ tag: "div", w: 400, h: 300, bg: "rgba(255, 255, 255, 0.05)", bgResolved: "#161618", bgOwnAlpha: 0.05, children: 3, radius: 16, border: 1, borderColor: "#222223" }),
    ],
  };
  const dna = buildDesignDna(raw, null);
  assert.equal(dna.mode, "dark");
  assert.equal(dna.colors.background, "#09090B");
  assert.equal(dna.colors.surface, "#161618");
  assert.equal(dna.colors.heading, "#FFFFFF");
  assert.ok(dna.colors.accents.includes("#7C86FF"));
  assert.match(dna.effects.textGradient ?? "", /#7C86FF/);
  assert.equal(dna.radii.button, 9999);
  assert.equal(dna.components.card?.border, "#222223");
});

test("summarizeSection reads columns, stats, buttons and repeated cards from a tree", () => {
  const text = (t: string, font: string, extra = {}) => ({ tag: "p", role: "text", text: t, box: [0, 0, 100, 20], s: { font, color: "#FFFFFF", ...extra } });
  const tree: RawNode = {
    tag: "section", box: [0, 0, 1440, 800], s: { pad: "80px 0px" },
    kids: [{
      tag: "div", box: [144, 80, 1152, 600], s: { display: "grid", cols: 2, gap: "48px" },
      kids: [
        { tag: "div", box: [144, 120, 528, 500], kids: [
          { tag: "h1", role: "heading", text: "Big headline", box: [0, 0, 500, 96], s: { font: "48px/700", color: "#FFFFFF" } },
          text("5+", "24px/700"), text("300+", "24px/700"),
          { tag: "a", role: "button", box: [0, 0, 145, 46], s: { bg: "#FFFFFF", radius: "full", pad: "12px 24px", font: "14px/600", color: "#18181B" }, kids: [text("Start now", "14px/600")] },
        ] },
        // vertically centred column: starts lower than the first one but still overlaps it
        { tag: "div", box: [816, 172, 384, 400], kids: [{ tag: "img", role: "image", box: [0, 0, 384, 400], s: { alt: "portrait", radius: "full" } }] },
      ],
    }],
  };
  const lines = summarizeSection("hero", tree).join("\n");
  assert.match(lines, /2-column grid \(gap 48px\)/);
  assert.match(lines, /Stats: 5\+, 300\+/);
  assert.match(lines, /"Start now" — filled #FFFFFF/);
  assert.match(lines, /Images: 384×400/);
  assert.doesNotMatch(lines, /"5\+" —/); // stats are not headings
});

test("tech info passes validation, flows into the DNA, and reaches the prompt", () => {
  const tech = {
    js: ["Next.js 16", "React"], css: ["Tailwind CSS v4"], ui: ["Radix UI (shadcn/ui-style)"], styling: ["Utility classes"], icons: ["Lucide"],
    animation: [], fonts: ["Google Fonts"], platform: [], lang: "en", dir: "ltr", viewportMeta: true, breakpoints: [640, 768, 1024],
    theme: { current: "dark" as const, mechanism: "class" as const, detail: 'class "dark" on <html>', hasDarkVariant: true, hasLightVariant: true, toggle: true, stored: "", colorScheme: "", alternate: { mode: "light" as const, background: "#FFFFFF", text: "#3F3F47", heading: "#18181B" } },
  };
  assert.equal(techSchema.safeParse(tech).success, true);
  assert.equal(techSchema.safeParse({ ...tech, theme: { ...tech.theme, mechanism: "magic" } }).success, false);

  const raw: RawPage = { title: "T", viewportWidth: 1440, pageBg: "#09090B", pageColor: "rgb(255, 255, 255)", themeColor: "", loadedFonts: [], sections: [], tech, samples: [sample({ tag: "p", textLen: 10 })] };
  const dna = buildDesignDna(raw, null);
  assert.deepEqual(dna.tech?.css, ["Tailwind CSS v4"]);
  const prompt = buildSitePrompt(dna, "UI Builder (v0, Bolt, Lovable)", "");
  assert.match(prompt, /Tailwind CSS v4/);
  assert.match(prompt, /Tech & theme/);
  assert.match(prompt, /NOT evidence of how the site was built/);
  assert.match(prompt, /"alternate":\{"mode":"light"/);
});

test("Code Assistant prompt puts the CSS tokens last, under a heading, and never before the overview", () => {
  const g = TARGET_GUIDANCE["Code Assistant (Claude, ChatGPT)"];
  const order = ["## Overview", "## Tech & theme", "## Page structure", "## Design tokens (CSS)"].map((h) => g.indexOf(h));
  assert.ok(order.every((i) => i >= 0), "all four headings are requested");
  assert.deepEqual([...order].sort((a, b) => a - b), order, "headings are requested in this order");
  assert.match(g, /Do NOT put any code before the Overview/);
});
