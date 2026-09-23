export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Parses the computed-style forms a browser emits: rgb()/rgba() (comma or space syntax) and #hex. */
export function parseColor(input: string): Rgba | null {
  const s = input.trim().toLowerCase();
  const fn = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
  if (fn) {
    const alphaRaw = fn[4];
    const a = alphaRaw === undefined ? 1 : alphaRaw.endsWith("%") ? parseFloat(alphaRaw) / 100 : parseFloat(alphaRaw);
    return { r: clamp255(+fn[1]), g: clamp255(+fn[2]), b: clamp255(+fn[3]), a: Math.min(1, Math.max(0, a)) };
  }
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split("").map((c) => c + c).join("") : hex[1];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
  }
  return null;
}

function clamp255(n: number): number {
  return Math.min(255, Math.max(0, Math.round(n)));
}

export function toHex({ r, g, b }: Rgba): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** Returns an uppercase #RRGGBB for a visible colour, or null for transparent / unparseable values. */
export function normalizeColor(input: string): string | null {
  const c = parseColor(input);
  if (!c || c.a < 0.05) return null;
  return toHex(c);
}

/** WCAG relative luminance, 0 (black) – 1 (white). */
export function luminance(hex: string): number {
  const c = parseColor(hex);
  if (!c) return 0;
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

/** HSL saturation (0–1) and lightness (0–1). */
export function saturationLightness(hex: string): { s: number; l: number } {
  const c = parseColor(hex);
  if (!c) return { s: 0, l: 0 };
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { s: 0, l };
  const d = max - min;
  return { s: l > 0.5 ? d / (2 - max - min) : d / (max + min), l };
}

export function colorDistance(a: string, b: string): number {
  const x = parseColor(a), y = parseColor(b);
  if (!x || !y) return Infinity;
  return Math.sqrt((x.r - y.r) ** 2 + (x.g - y.g) ** 2 + (x.b - y.b) ** 2);
}
