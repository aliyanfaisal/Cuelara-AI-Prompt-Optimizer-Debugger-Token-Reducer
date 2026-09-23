import { z } from "zod";

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const short = z.string().max(200);

interface NodeShape {
  tag: string;
  role?: string;
  text?: string;
  box: number[];
  s?: Record<string, string | number | boolean>;
  kids?: NodeShape[];
}

const techList = z.array(z.string().max(80)).max(8);

/** What the site is built with and how its theme works — detected in the browser, so bounded tightly. */
export const techSchema = z.object({
  js: techList,
  css: techList,
  ui: techList,
  styling: techList,
  icons: techList,
  animation: techList,
  fonts: techList,
  platform: techList,
  lang: z.string().max(12),
  dir: z.string().max(8),
  viewportMeta: z.boolean(),
  breakpoints: z.array(z.number().finite()).max(8),
  theme: z.object({
    current: z.enum(["light", "dark"]),
    mechanism: z.enum(["class", "attribute", "media-query", "none"]),
    detail: z.string().max(120),
    hasDarkVariant: z.boolean(),
    hasLightVariant: z.boolean(),
    toggle: z.boolean(),
    stored: z.string().max(80),
    colorScheme: z.string().max(40),
    alternate: z
      .object({ mode: z.enum(["light", "dark"]), background: z.string().max(9), text: z.string().max(9), heading: z.string().max(9) })
      .nullable(),
  }),
});

/** A section's layout tree: recursive, so bounded by field lengths and child counts (the request size is capped in the route). */
const nodeSchema: z.ZodType<NodeShape> = z.lazy(() =>
  z.object({
    tag: z.string().max(24),
    role: z.string().max(16).optional(),
    text: z.string().max(140).optional(),
    box: z.array(z.number().finite()).length(4),
    s: z.record(z.string().max(24), z.union([z.string().max(320), z.number().finite(), z.boolean()])).optional(),
    kids: z.array(nodeSchema).max(16).optional(),
  })
);

/** Validates a DesignDna coming back from the browser — the client can edit it, so it is untrusted input. */
export const designDnaSchema = z.object({
  source: z.object({ url: z.string().max(2048).nullable(), title: short }),
  mode: z.enum(["light", "dark"]),
  colors: z.object({
    background: hex,
    surface: hex.nullable(),
    text: hex,
    mutedText: hex.nullable(),
    accent: hex.nullable(),
    accents: z.array(hex).max(6),
    heading: hex.nullable(),
    border: hex.nullable(),
    palette: z.array(z.object({ hex, share: z.number() })).max(10),
  }),
  typography: z.object({
    headingFont: short,
    bodyFont: short,
    loadedFonts: z.array(short).max(12),
    scale: z
      .array(z.object({ role: short, size: z.number(), weight: z.number(), lineHeight: z.number().nullable(), letterSpacing: z.number().nullable() }))
      .max(10),
  }),
  spacing: z.object({ baseUnit: z.number().nullable(), scale: z.array(z.number()).max(10) }),
  radii: z.object({ common: z.array(z.number()).max(6), button: z.number().nullable(), card: z.number().nullable() }),
  shadows: z.array(z.string().max(240)).max(4),
  effects: z.object({ backdropBlur: z.boolean(), gradients: z.array(z.string().max(400)).max(4), textGradient: z.string().max(400).nullable() }),
  cssVariables: z.array(z.object({ name: z.string().max(80), value: z.string().max(120) })).max(70),
  tech: techSchema.nullable(),
  layout: z.object({
    containerWidth: z.number().nullable(),
    usesGrid: z.boolean(),
    usesFlex: z.boolean(),
    gridColumns: z.array(z.number()).max(4),
    sections: z
      .array(
        z.object({
          role: z.string().max(16),
          kind: short,
          y: z.number(),
          height: z.number(),
          background: hex.nullable(),
          heading: short,
          summary: z.array(z.string().max(400)).max(30),
          tree: nodeSchema.nullable(),
        })
      )
      .max(14),
  }),
  components: z.object({
    buttonSecondary: z
      .object({ bg: hex.nullable(), color: hex, border: hex.nullable(), radius: z.number(), padding: short, fontWeight: z.number(), shadow: z.string().max(240).nullable() })
      .nullable(),
    button: z
      .object({ bg: hex.nullable(), color: hex, border: hex.nullable(), radius: z.number(), padding: short, fontWeight: z.number(), shadow: z.string().max(240).nullable() })
      .nullable(),
    card: z
      .object({ bg: hex.nullable(), color: hex, border: hex.nullable(), radius: z.number(), padding: short, fontWeight: z.number(), shadow: z.string().max(240).nullable() })
      .nullable(),
  }),
});

const num = z.number().finite();
const cssColor = z.string().max(64);

const rawSampleSchema = z.object({
  tag: z.string().max(32),
  w: num,
  h: num,
  color: cssColor,
  bg: cssColor,
  bgResolved: z.string().max(16).optional(),
  bgOwnAlpha: num.optional(),
  bgImage: z.string().max(400),
  textGradient: z.string().max(400).optional(),
  borderColor: z.string().max(16).optional(),
  svgStroke: z.string().max(16).optional(),
  letterSpacing: num.optional(),
  fontFamily: z.string().max(200),
  fontSize: num,
  fontWeight: num,
  lineHeight: num,
  radius: num,
  shadow: z.string().max(220),
  border: num,
  padding: z.array(num).length(4),
  margin: z.array(num).length(4),
  gap: num,
  display: z.string().max(32),
  gridColumns: num,
  maxWidth: num,
  textLen: num,
  children: num,
  isButton: z.boolean(),
  isLink: z.boolean(),
  backdropBlur: z.boolean(),
});

/** Validates the measurements the browser extension sends — arbitrary client input, so bounded tightly. */
export const rawPageSchema = z.object({
  title: z.string().max(200),
  viewportWidth: num,
  pageBg: cssColor,
  pageColor: cssColor,
  themeColor: cssColor,
  loadedFonts: z.array(z.string().max(100)).max(12),
  cssVariables: z.array(z.object({ name: z.string().max(80), value: z.string().max(120) })).max(70).optional(),
  tech: techSchema.nullable().optional(),
  sections: z
    .array(
      z.object({
        tag: z.string().max(32),
        h: num,
        bg: cssColor,
        display: z.string().max(32),
        children: num,
        heading: z.string().max(120),
        role: z.string().max(16).optional(),
        y: num.optional(),
        w: num.optional(),
        tree: nodeSchema.nullable().optional(),
      })
    )
    .max(14),
  samples: z.array(rawSampleSchema).max(4000),
});
