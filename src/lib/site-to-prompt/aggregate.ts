import { normalizeColor, luminance, saturationLightness, colorDistance } from "./color";
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
const MIN_ACCENT_SATURATION = 0.3;
// Two palette entries closer than this in RGB space read as the same colour to a designer.
const PALETTE_MERGE_DISTANCE = 18;

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

function paletteFrom(samples: RawSample[], pageBg: string | null): PaletteColor[] {
  const t = new Tally<string>();
  for (const s of samples) {
    const area = s.w * s.h;
    const bg = normalizeColor(s.bg);
    if (bg) t.add(bg, area);
    const fg = normalizeColor(s.color);
    // A glyph covers a sliver of its box, so weight text colour by how much text there is instead.
    if (fg && s.textLen > 0) t.add(fg, s.textLen * s.fontSize * 40);
  }
  if (pageBg) t.add(pageBg, 1_000_000);

  const merged: [string, number][] = [];
  for (const [hex, weight] of t.ranked()) {
    const near = merged.find(([m]) => colorDistance(m, hex) < PALETTE_MERGE_DISTANCE);
    if (near) near[1] += weight;
    else merged.push([hex, weight]);
  }
  const total = merged.reduce((sum, [, w]) => sum + w, 0) || 1;
  return merged
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([hex, w]) => ({ hex, share: Math.round((w / total) * 1000) / 1000 }));
}

function pickAccent(samples: RawSample[], background: string): string | null {
  const t = new Tally<string>();
  for (const s of samples) {
    const candidates: [string | null, number][] = [];
    if (s.isButton) candidates.push([normalizeColor(s.bg), 6]);
    if (s.isLink) candidates.push([normalizeColor(s.color), 2]);
    candidates.push([normalizeColor(s.bg), 1]);
    for (const [hex, weight] of candidates) {
      if (!hex || hex === background) continue;
      const { s: sat, l } = saturationLightness(hex);
      if (sat < MIN_ACCENT_SATURATION || l < 0.12 || l > 0.92) continue;
      t.add(hex, weight * Math.sqrt(s.w * s.h));
    }
  }
  return t.top();
}

function typeScale(samples: RawSample[]): TypeStyle[] {
  const styleOf = (group: RawSample[], role: string): TypeStyle | null => {
    if (group.length === 0) return null;
    const size = modeOf(group.map((s) => s.fontSize));
    if (size === null) return null;
    const atSize = group.filter((s) => s.fontSize === size);
    const weight = modeOf(atSize.map((s) => s.fontWeight)) ?? 400;
    const lh = modeOf(atSize.map((s) => s.lineHeight).filter((v) => v > 0));
    return { role, size: round1(size), weight, lineHeight: lh ? round1(lh) : null };
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

function describeComponent(group: RawSample[]): ComponentStyle | null {
  if (group.length === 0) return null;
  const bg = modeOf(group.map((s) => normalizeColor(s.bg)).filter((v): v is string => !!v));
  if (!bg) return null;
  const same = group.filter((s) => normalizeColor(s.bg) === bg);
  const color = modeOf(same.map((s) => normalizeColor(s.color)).filter((v): v is string => !!v)) ?? "#000000";
  const radius = modeOf(same.map((s) => Math.round(s.radius))) ?? 0;
  const pad = modeOf(same.map((s) => s.padding.map((p) => Math.round(p)).join(" "))) ?? "0 0 0 0";
  const [t, r, b, l] = pad.split(" ");
  const padding = t === b && r === l ? (t === r ? `${t}px` : `${t}px ${r}px`) : `${t}px ${r}px ${b}px ${l}px`;
  return {
    bg,
    color,
    radius,
    padding,
    fontWeight: modeOf(same.map((s) => s.fontWeight)) ?? 400,
    shadow: modeOf(same.map((s) => s.shadow).filter(Boolean)),
  };
}

function isCard(s: RawSample, viewportWidth: number, pageBg: string): boolean {
  if (s.isButton || s.children < 2) return false;
  if (s.w < 120 || s.h < 80 || s.w > viewportWidth * 0.7) return false;
  const bg = normalizeColor(s.bg);
  const framed = s.radius >= 4 || !!s.shadow || s.border > 0;
  return framed && !!bg && bg !== pageBg;
}

export function buildDesignDna(raw: RawPage, url: string | null): DesignDna {
  const pageBg = normalizeColor(raw.pageBg) ?? normalizeColor(raw.themeColor) ?? "#FFFFFF";
  const samples = raw.samples;
  const palette = paletteFrom(samples, pageBg);

  const bgTally = new Tally<string>();
  for (const s of samples) {
    const bg = normalizeColor(s.bg);
    if (bg && bg !== pageBg) bgTally.add(bg, s.w * s.h);
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
        return hex !== text && d >= 80 && d < colorDistance(text, pageBg) && saturationLightness(hex).s < 0.25;
      }) ?? null;

  const headingSamples = samples.filter((s) => HEADING_TAGS.includes(s.tag.toLowerCase()) && s.textLen > 0);
  const bodyFontTally = new Tally<string>();
  for (const s of samples) if (s.textLen > 0 && !HEADING_TAGS.includes(s.tag)) bodyFontTally.add(firstFont(s.fontFamily), s.textLen);
  const bodyFont = bodyFontTally.top() ?? "sans-serif";
  const headingFont = modeOf(headingSamples.map((s) => firstFont(s.fontFamily))) ?? bodyFont;

  const radiusTally = new Tally<number>();
  const shadowTally = new Tally<string>();
  for (const s of samples) {
    if (s.radius > 0 && s.radius < 999) radiusTally.add(Math.round(s.radius));
    if (s.shadow) shadowTally.add(s.shadow);
  }

  const buttons = samples.filter((s) => s.isButton && normalizeColor(s.bg));
  const cards = samples.filter((s) => isCard(s, raw.viewportWidth, pageBg));

  const gradientTally = new Tally<string>();
  for (const s of samples) if (s.bgImage.includes("gradient")) gradientTally.add(s.bgImage, s.w * s.h);

  const containerTally = new Tally<number>();
  for (const s of samples) if (s.maxWidth >= 640 && s.maxWidth < 4000) containerTally.add(Math.round(s.maxWidth));

  const gridCols = new Tally<number>();
  for (const s of samples) if (s.gridColumns > 1) gridCols.add(s.gridColumns);

  return {
    source: { url, title: raw.title },
    mode: luminance(pageBg) < 0.25 ? "dark" : "light",
    colors: {
      background: pageBg,
      surface,
      text,
      mutedText,
      accent: pickAccent(samples, pageBg),
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
      button: buttons.length ? modeOf(buttons.map((s) => Math.round(s.radius))) : null,
      card: cards.length ? modeOf(cards.map((s) => Math.round(s.radius))) : null,
    },
    shadows: shadowTally.ranked().slice(0, 3).map(([v]) => v),
    effects: {
      backdropBlur: samples.some((s) => s.backdropBlur),
      gradients: gradientTally.ranked().slice(0, 3).map(([v]) => v),
    },
    layout: {
      containerWidth: containerTally.top(),
      usesGrid: samples.some((s) => s.display === "grid" || s.display === "inline-grid"),
      usesFlex: samples.some((s) => s.display === "flex" || s.display === "inline-flex"),
      gridColumns: gridCols.ranked().slice(0, 3).map(([v]) => v),
      sections: raw.sections.map((s) => ({
        kind: s.tag,
        height: s.h,
        background: normalizeColor(s.bg),
        heading: s.heading,
      })),
    },
    components: {
      button: describeComponent(buttons),
      card: describeComponent(cards),
    },
  };
}
