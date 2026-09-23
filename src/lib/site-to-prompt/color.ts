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
  const ok = s.match(/^ok(lab|lch)\(\s*([^)]*)\)$/);
  if (ok) return parseOk(ok[1] as "lab" | "lch", ok[2]);
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split("").map((c) => c + c).join("") : hex[1];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
  }
  return null;
}

/** oklab()/oklch() → sRGB. Current browsers report many computed colours this way (Tailwind v4 etc.). */
function parseOk(kind: "lab" | "lch", body: string): Rgba | null {
  const [main, alphaPart] = body.split("/").map((p) => p.trim());
  const parts = main.split(/[\s,]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const num = (v: string, pctScale: number) => {
    if (v === "none") return 0;
    return v.endsWith("%") ? (parseFloat(v) / 100) * pctScale : parseFloat(v);
  };
  const L = num(parts[0], 1);
  let a: number, b: number;
  if (kind === "lab") {
    a = num(parts[1], 0.4);
    b = num(parts[2], 0.4);
  } else {
    const C = num(parts[1], 0.4);
    const h = (parseFloat(parts[2]) * Math.PI) / 180;
    a = C * Math.cos(h);
    b = C * Math.sin(h);
  }
  if (![L, a, b].every(Number.isFinite)) return null;
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sv = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * sv,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * sv,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * sv,
  ];
  const enc = (c: number) => {
    const v = Math.min(1, Math.max(0, c));
    return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  };
  const alpha = alphaPart === undefined ? 1 : alphaPart.endsWith("%") ? parseFloat(alphaPart) / 100 : parseFloat(alphaPart);
  return { r: clamp255(enc(lin[0]) * 255), g: clamp255(enc(lin[1]) * 255), b: clamp255(enc(lin[2]) * 255), a: Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1 };
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

/** Blends a translucent colour onto an opaque backdrop. */
export function compositeOver(backdropHex: string, top: Rgba): string {
  const base = parseColor(backdropHex);
  if (!base) return toHex(top);
  const mix = (t: number, b: number) => Math.round(t * top.a + b * (1 - top.a));
  return toHex({ r: mix(top.r, base.r), g: mix(top.g, base.g), b: mix(top.b, base.b), a: 1 });
}

/** Every colour (hex or rgb/rgba) mentioned in a gradient or shadow string, with its alpha. */
export function colorsInString(str: string): { hex: string; alpha: number }[] {
  const out: { hex: string; alpha: number }[] = [];
  for (const m of str.matchAll(/rgba?\([^)]*\)|#[0-9a-fA-F]{6}\b|ok(?:lab|lch)\([^)]*\)/g)) {
    const c = parseColor(m[0]);
    if (c && c.a > 0.02) out.push({ hex: toHex(c), alpha: c.a });
  }
  return out;
}
