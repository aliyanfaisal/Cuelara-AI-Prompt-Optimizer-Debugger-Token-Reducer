import test from "node:test";
import assert from "node:assert/strict";
import { normalizeColor } from "./color";
import { buildDesignDna } from "./aggregate";
import type { RawPage, RawSample } from "./types";

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
