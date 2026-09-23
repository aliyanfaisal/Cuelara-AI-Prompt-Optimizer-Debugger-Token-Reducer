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

export interface RawSection {
  tag: string;
  h: number;
  bg: string;
  display: string;
  children: number;
  heading: string;
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
    sections: { kind: string; height: number; background: string | null; heading: string }[];
  };
  components: { button: ComponentStyle | null; buttonSecondary: ComponentStyle | null; card: ComponentStyle | null };
}
