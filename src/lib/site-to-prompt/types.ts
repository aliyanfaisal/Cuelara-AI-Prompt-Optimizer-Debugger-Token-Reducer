/** One visible element as measured in the rendered page — plain data, no interpretation yet. */
export interface RawSample {
  tag: string;
  w: number;
  h: number;
  color: string;
  bg: string;
  /** Colour actually painted behind the element (own + ancestor layers blended). Absent from older extension versions. */
  bgResolved?: string;
  bgOwnAlpha?: number;
  bgImage: string;
  textGradient?: string;
  borderColor?: string;
  svgStroke?: string;
  letterSpacing?: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  radius: number;
  shadow: string;
  border: number;
  padding: number[];
  margin: number[];
  gap: number;
  display: string;
  gridColumns: number;
  maxWidth: number;
  textLen: number;
  children: number;
  isButton: boolean;
  isLink: boolean;
  backdropBlur: boolean;
}

/** One element of a section's simplified layout tree, as measured in the page. */
export interface RawNode {
  tag: string;
  role?: string;
  text?: string;
  /** [x, y, width, height] relative to the section's top-left corner. */
  box: number[];
  /** Only the styles that matter: layout, paint and text, keyed by short names. */
  s?: Record<string, string | number | boolean>;
  kids?: RawNode[];
}

export interface RawSection {
  tag: string;
  h: number;
  bg: string;
  display: string;
  children: number;
  heading: string;
  role?: string;
  y?: number;
  w?: number;
  tree?: RawNode | null;
}

export interface RawPage {
  title: string;
  viewportWidth: number;
  pageBg: string;
  pageColor: string;
  themeColor: string;
  loadedFonts: string[];
  cssVariables?: { name: string; value: string }[];
  sections: RawSection[];
  samples: RawSample[];
}

export interface PaletteColor {
  hex: string;
  share: number;
}

export interface TypeStyle {
  role: string;
  size: number;
  weight: number;
  lineHeight: number | null;
  letterSpacing: number | null;
}

export interface ComponentStyle {
  bg: string | null;
  color: string;
  border: string | null;
  radius: number;
  padding: string;
  fontWeight: number;
  shadow: string | null;
}

export interface DesignDna {
  source: { url: string | null; title: string };
  mode: "light" | "dark";
  colors: {
    background: string;
    surface: string | null;
    text: string;
    mutedText: string | null;
    accent: string | null;
    /** Distinct saturated brand colours, strongest first (accent is the first). */
    accents: string[];
    heading: string | null;
    border: string | null;
    palette: PaletteColor[];
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    loadedFonts: string[];
    scale: TypeStyle[];
  };
  spacing: { baseUnit: number | null; scale: number[] };
  radii: { common: number[]; button: number | null; card: number | null };
  shadows: string[];
  effects: { backdropBlur: boolean; gradients: string[]; textGradient: string | null };
  cssVariables: { name: string; value: string }[];
  layout: {
    containerWidth: number | null;
    usesGrid: boolean;
    usesFlex: boolean;
    gridColumns: number[];
    sections: DnaSection[];
  };
  components: { button: ComponentStyle | null; buttonSecondary: ComponentStyle | null; card: ComponentStyle | null };
}

export interface DnaSection {
  /** header | hero | section | footer */
  role: string;
  kind: string;
  y: number;
  height: number;
  background: string | null;
  heading: string;
  /** Plain-language facts about the section, derived from its tree. */
  summary: string[];
  tree: RawNode | null;
}
