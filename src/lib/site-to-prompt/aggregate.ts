import { normalizeColor, luminance, saturationLightness, colorDistance, colorsInString } from "./color";
import { summarizeSection } from "./summarize";
import type { ComponentStyle, DesignDna, PaletteColor, RawPage, RawSample, TypeStyle } from "./types";

/** Weighted tally: add(key, weight) repeatedly, then read entries ranked by total weight. */
class Tally<K> {
  private map = new Map<K, number>();
  add(key: K, weight = 1) {
    this.map.set(key, (this.map.get(key) ?? 0) + weight);
  }
  get total(): number {
    let t = 0;
    for (const v of this.map.values()) t += v;
    return t;
  }
  ranked(): [K, number][] {
    return [...this.map.entries()].sort((a, b) => b[1] - a[1]);
  }
  top(): K | null {
    return this.ranked()[0]?.[0] ?? null;
  }
}

const HEADING_TAGS = ["h1", "h2", "h3"];
const MIN_ACCENT_SATURATION = 0.28;
// Two palette entries closer than this in RGB space read as the same colour to a designer.
const PALETTE_MERGE_DISTANCE = 14;
const DISTINCT_ACCENT_DISTANCE = 45;
const PILL_RADIUS = 9999;

export function firstFont(family: string): string {
  const first = family.split(",")[0]?.trim().replace(/^["']|["']$/g, "") ?? "";
  return first || "sans-serif";
}

function modeOf<T>(items: T[]): T | null {
  const t = new Tally<T>();
  for (const i of items) t.add(i);
  return t.top();
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** The colour an element paints for itself (own background blended onto what is behind it), or null if it has none. */
function paint(s: RawSample): string | null {
  if (s.bgResolved !== undefined) {
    return (s.bgOwnAlpha ?? 1) > 0.004 ? normalizeColor(s.bgResolved) : null;
  }
  return normalizeColor(s.bg); // measurements from an older extension version
}

function gradientStops(s: RawSample): { hex: string; alpha: number }[] {
  return s.bgImage.includes("gradient") ? colorsInString(s.bgImage) : [];
}

function paletteFrom(samples: RawSample[], pageBg: string): PaletteColor[] {
  const t = new Tally<string>();
  // Nested elements overlap, so summed areas overstate surfaces; give the page background a fair share of the total.
  const totalArea = samples.reduce((sum, s) => sum + s.w * s.h, 0);
  t.add(pageBg, Math.max(1_000_000, totalArea * 0.4));
  for (const s of samples) {
    const area = s.w * s.h;
    const bg = paint(s);
    if (bg) t.add(bg, area);
    const fg = normalizeColor(s.color);
    // A glyph covers a sliver of its box, so weight text colour by how much text there is instead.
    if (fg && s.textLen > 0) t.add(fg, s.textLen * s.fontSize * 40);
    for (const stop of gradientStops(s)) t.add(stop.hex, area * stop.alpha * 0.15);
    for (const stop of s.textGradient ? colorsInString(s.textGradient) : []) t.add(stop.hex, s.textLen * s.fontSize * 60);
    if (s.svgStroke) t.add(s.svgStroke, 400);
  }

  const merged: [string, number][] = [];
  for (const [hex, weight] of t.ranked()) {
    const near = merged.find(([m]) => colorDistance(m, hex) < PALETTE_MERGE_DISTANCE);
    if (near) near[1] += weight;
    else merged.push([hex, weight]);
  }
  const total = merged.reduce((sum, [, w]) => sum + w, 0) || 1;
  return merged
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([hex, w]) => ({ hex, share: Math.round((w / total) * 1000) / 1000 }));
}

/** Brand colours: saturated colours from buttons, gradient text, gradients/glows, icons, links and borders. */
function pickAccents(samples: RawSample[], pageBg: string): string[] {
  const t = new Tally<string>();
  const add = (hex: string | null | undefined, weight: number) => {
    if (!hex) return;
    const { s, l } = saturationLightness(hex);
    if (s < MIN_ACCENT_SATURATION || l < 0.3 || l > 0.88) return;
    if (colorDistance(hex, pageBg) < 30) return;
    t.add(hex, weight);
  };

  for (const s of samples) {
    const size = Math.sqrt(s.w * s.h);
    if (s.isButton) add(paint(s), 12 * size);
    // Plain body/heading text colour is not a brand colour — only links count from text.
    if (s.isLink) add(normalizeColor(s.color), 2 * Math.sqrt(s.textLen * s.fontSize));
    add(paint(s), size);
    for (const stop of gradientStops(s)) add(stop.hex, 0.4 * size * stop.alpha);
    for (const stop of s.textGradient ? colorsInString(s.textGradient) : []) add(stop.hex, 40 * s.fontSize);
    add(s.svgStroke, 1.5 * size);
    add(s.borderColor, 0.5 * size);
  }

  const merged: [string, number][] = [];
  for (const [hex, weight] of t.ranked()) {
    const near = merged.find(([m]) => colorDistance(m, hex) < DISTINCT_ACCENT_DISTANCE);
    if (near) near[1] += weight;
    else merged.push([hex, weight]);
  }
  return merged
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([hex]) => hex);
}

function typeScale(samples: RawSample[]): TypeStyle[] {
  const styleOf = (group: RawSample[], role: string): TypeStyle | null => {
    if (group.length === 0) return null;
    const size = modeOf(group.map((s) => s.fontSize));
    if (size === null) return null;
    const atSize = group.filter((s) => s.fontSize === size);
    const weight = modeOf(atSize.map((s) => s.fontWeight)) ?? 400;
    const lh = modeOf(atSize.map((s) => s.lineHeight).filter((v) => v > 0));
    const ls = modeOf(atSize.map((s) => round1(s.letterSpacing ?? 0)));
    return { role, size: round1(size), weight, lineHeight: lh ? round1(lh) : null, letterSpacing: ls ? ls : null };
  };

  const out: TypeStyle[] = [];
  for (const tag of HEADING_TAGS) {
    const style = styleOf(samples.filter((s) => s.tag === tag && s.textLen > 0), tag);
    if (style) out.push(style);
  }

  const text = samples.filter((s) => s.textLen > 0 && !HEADING_TAGS.includes(s.tag) && !s.isButton);
  const sizeWeight = new Tally<number>();
  for (const s of text) sizeWeight.add(s.fontSize, s.textLen);
  const bodySize = sizeWeight.top();
  if (bodySize !== null) {
    const body = styleOf(text.filter((s) => s.fontSize === bodySize), "body");
    if (body) out.push(body);
    const small = styleOf(text.filter((s) => s.fontSize < bodySize), "small");
    if (small) out.push(small);
  }

  const btn = styleOf(samples.filter((s) => s.isButton && s.textLen > 0), "button");
  if (btn) out.push(btn);
  return out;
}

function spacing(samples: RawSample[]): { baseUnit: number | null; scale: number[] } {
  const t = new Tally<number>();
  for (const s of samples) {
    for (const v of [...s.padding, ...s.margin, s.gap]) {
      const r = Math.round(v);
      if (r >= 2 && r <= 128) t.add(r);
    }
  }
  const ranked = t.ranked();
  const total = t.total;
  if (total === 0) return { baseUnit: null, scale: [] };

  const shareMultipleOf = (n: number) =>
    ranked.filter(([v]) => v % n === 0).reduce((sum, [, w]) => sum + w, 0) / total;
  const baseUnit = shareMultipleOf(8) >= 0.6 ? 8 : shareMultipleOf(4) >= 0.6 ? 4 : null;

  const scale = ranked
    .slice(0, 8)
    .map(([v]) => v)
    .sort((a, b) => a - b);
  return { baseUnit, scale };
}

function paddingOf(group: RawSample[]): string {
  const pad = modeOf(group.map((s) => s.padding.map((p) => Math.round(p)).join(" "))) ?? "0 0 0 0";
  const [t, r, b, l] = pad.split(" ");
  return t === b && r === l ? (t === r ? `${t}px` : `${t}px ${r}px`) : `${t}px ${r}px ${b}px ${l}px`;
}

function describeComponent(group: RawSample[], withFill: boolean): ComponentStyle | null {
  if (group.length === 0) return null;
  let same = group;
  let bg: string | null = null;
  if (withFill) {
    bg = modeOf(group.map(paint).filter((v): v is string => !!v));
    if (!bg) return null;
    same = group.filter((s) => paint(s) === bg);
  }
  return {
    bg,
    color: modeOf(same.map((s) => normalizeColor(s.color)).filter((v): v is string => !!v)) ?? "#000000",
    border: modeOf(same.map((s) => s.borderColor).filter((v): v is string => !!v)),
    radius: modeOf(same.map((s) => Math.round(s.radius))) ?? 0,
    padding: paddingOf(same),
    fontWeight: modeOf(same.map((s) => s.fontWeight)) ?? 400,
    shadow: modeOf(same.map((s) => s.shadow).filter(Boolean)),
  };
}

function isCard(s: RawSample, viewportWidth: number, pageBg: string): boolean {
  if (s.isButton || s.children < 2) return false;
  if (s.w < 120 || s.h < 80 || s.w > viewportWidth * 0.7) return false;
  const bg = paint(s);
  const framed = s.radius >= 4 || !!s.shadow || s.border > 0;
  const distinct = !!bg && colorDistance(bg, pageBg) > 4;
  return framed && (distinct || !!s.borderColor) && s.h < 900;
}

export function buildDesignDna(raw: RawPage, url: string | null): DesignDna {
  const pageBg = normalizeColor(raw.pageBg) ?? normalizeColor(raw.themeColor) ?? "#FFFFFF";
  const samples = raw.samples;
  const palette = paletteFrom(samples, pageBg);

  const bgTally = new Tally<string>();
  for (const s of samples) {
    const bg = paint(s);
    if (bg && colorDistance(bg, pageBg) > 6) bgTally.add(bg, s.w * s.h);
  }
  const surface = bgTally.top();

  const textTally = new Tally<string>();
  for (const s of samples) {
    const fg = normalizeColor(s.color);
    if (fg && s.textLen > 0) textTally.add(fg, s.textLen * s.fontSize);
  }
  const text = textTally.top() ?? normalizeColor(raw.pageColor) ?? "#111111";
  const mutedText =
    textTally
      .ranked()
      .map(([hex]) => hex)
      .find((hex) => {
        const d = colorDistance(hex, pageBg);
        // Readable against the page (not the near-invisible tones), yet quieter than the main text.
        return hex !== text && d >= 60 && d < colorDistance(text, pageBg) && saturationLightness(hex).s < 0.3;
      }) ?? null;

  const headingSamples = samples.filter((s) => HEADING_TAGS.includes(s.tag.toLowerCase()) && s.textLen > 0);
  const heading = modeOf(headingSamples.map((s) => normalizeColor(s.color)).filter((v): v is string => !!v));
  const bodyFontTally = new Tally<string>();
  for (const s of samples) if (s.textLen > 0 && !HEADING_TAGS.includes(s.tag)) bodyFontTally.add(firstFont(s.fontFamily), s.textLen);
  const bodyFont = bodyFontTally.top() ?? "sans-serif";
  const headingFont = modeOf(headingSamples.map((s) => firstFont(s.fontFamily))) ?? bodyFont;

  const radiusTally = new Tally<number>();
  const shadowTally = new Tally<string>();
  const borderTally = new Tally<string>();
  for (const s of samples) {
    if (s.radius > 0) radiusTally.add(s.radius >= 999 ? PILL_RADIUS : Math.round(s.radius));
    if (s.shadow) shadowTally.add(s.shadow);
    if (s.borderColor) borderTally.add(s.borderColor);
  }

  const withText = (s: RawSample) => s.textLen > 0 || s.children > 0;
  const buttons = samples.filter((s) => s.isButton && withText(s));
  const filledButtons = buttons.filter((s) => paint(s));
  const outlineButtons = buttons.filter((s) => !paint(s) && s.borderColor);
  const cards = samples.filter((s) => isCard(s, raw.viewportWidth, pageBg));

  const gradientTally = new Tally<string>();
  for (const s of samples) if (s.bgImage.includes("gradient") && !s.textGradient) gradientTally.add(s.bgImage, s.w * s.h);

  const textGradient = samples
    .filter((s) => s.textGradient)
    .sort((a, b) => b.fontSize * b.textLen - a.fontSize * a.textLen)[0]?.textGradient ?? null;

  const containerTally = new Tally<number>();
  for (const s of samples) if (s.maxWidth >= 640 && s.maxWidth < 4000) containerTally.add(Math.round(s.maxWidth));

  const gridCols = new Tally<number>();
  for (const s of samples) if (s.gridColumns > 1) gridCols.add(s.gridColumns);

  const accents = pickAccents(samples, pageBg);

  return {
    source: { url, title: raw.title },
    mode: luminance(pageBg) < 0.25 ? "dark" : "light",
    colors: {
      background: pageBg,
      surface,
      text,
      mutedText,
      accent: accents[0] ?? null,
      accents,
      heading: heading && heading !== text ? heading : null,
      border: borderTally.top(),
      palette,
    },
    typography: {
      headingFont,
      bodyFont,
      loadedFonts: raw.loadedFonts,
      scale: typeScale(samples),
    },
    spacing: spacing(samples),
    radii: {
      common: radiusTally.ranked().slice(0, 4).map(([v]) => v),
      button: buttons.length ? modeOf(buttons.map((s) => (s.radius >= 999 ? PILL_RADIUS : Math.round(s.radius)))) : null,
      card: cards.length ? modeOf(cards.map((s) => (s.radius >= 999 ? PILL_RADIUS : Math.round(s.radius)))) : null,
    },
    shadows: shadowTally.ranked().slice(0, 3).map(([v]) => v),
    effects: {
      backdropBlur: samples.some((s) => s.backdropBlur),
      gradients: gradientTally.ranked().slice(0, 3).map(([v]) => v),
      textGradient,
    },
    cssVariables: (raw.cssVariables ?? []).slice(0, 60),
    tech: raw.tech ?? null,
    layout: {
      containerWidth: containerTally.top(),
      usesGrid: samples.some((s) => s.display === "grid" || s.display === "inline-grid"),
      usesFlex: samples.some((s) => s.display === "flex" || s.display === "inline-flex"),
      gridColumns: gridCols.ranked().slice(0, 3).map(([v]) => v),
      sections: raw.sections.map((s) => ({
        role: s.role ?? "section",
        kind: s.tag,
        y: s.y ?? 0,
        height: s.h,
        background: normalizeColor(s.bg),
        heading: s.heading,
        summary: summarizeSection(s.role ?? "section", s.tree ?? null),
        tree: s.tree ?? null,
      })),
    },
    components: {
      button: describeComponent(filledButtons, true),
      buttonSecondary: describeComponent(outlineButtons, false),
      card: describeComponent(cards, true),
    },
  };
}
