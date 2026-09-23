import type { RawNode } from "./types";

type Style = NonNullable<RawNode["s"]>;

const str = (s: Style | undefined, key: string): string => (s && typeof s[key] === "string" ? (s[key] as string) : "");
const num = (s: Style | undefined, key: string): number => (s && typeof s[key] === "number" ? (s[key] as number) : 0);

function walk(node: RawNode, visit: (n: RawNode, depth: number, parent: RawNode | null) => void, depth = 0, parent: RawNode | null = null) {
  visit(node, depth, parent);
  for (const k of node.kids ?? []) walk(k, visit, depth + 1, node);
}

function textOf(node: RawNode): string {
  const parts: string[] = [];
  walk(node, (n) => n.text && parts.push(n.text));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function fontSize(n: RawNode): number {
  return parseFloat(str(n.s, "font")) || 0;
}

function describeFont(n: RawNode): string {
  const f = str(n.s, "font");
  const color = str(n.s, "textGradient") ? "gradient text" : str(n.s, "color");
  return [f, color, str(n.s, "transform")].filter(Boolean).join(", ");
}

function box(n: RawNode): string {
  const s = n.s;
  return [
    str(s, "bg") && `bg ${str(s, "bgSeen") || str(s, "bg")}`,
    str(s, "bgImage") && "gradient/image fill",
    str(s, "border") && `border ${str(s, "border")}`,
    str(s, "radius") && `radius ${str(s, "radius")}`,
    str(s, "shadow") && "shadow",
    str(s, "blur") && `backdrop ${str(s, "blur")}`,
    str(s, "pad") && `padding ${str(s, "pad")}`,
  ]
    .filter(Boolean)
    .join(", ");
}

function shortList(items: string[], max = 8): string {
  const shown = items.slice(0, max).join(", ");
  return items.length > max ? `${shown} … (+${items.length - max})` : shown;
}

const overlapsVertically = (a: RawNode, b: RawNode): boolean => {
  const top = Math.max(a.box[1], b.box[1]);
  const bottom = Math.min(a.box[1] + a.box[3], b.box[1] + b.box[3]);
  return bottom - top >= Math.min(a.box[3], b.box[3]) * 0.5;
};

/** Finds the first container whose children sit side by side (a multi-column layout). */
function findColumns(root: RawNode): { node: RawNode; widths: number[]; items: number } | null {
  const queue: [RawNode, number][] = [[root, 0]];
  while (queue.length) {
    const [n, d] = queue.shift()!;
    const kids = (n.kids ?? []).filter((k) => str(k.s, "pos") !== "absolute" && str(k.s, "pos") !== "fixed");
    if (kids.length >= 2 && n.box[2] > 0) {
      const display = str(n.s, "display");
      const cols = num(n.s, "cols");
      if (display === "grid" && cols >= 2) {
        const first = kids.slice(0, cols);
        return { node: n, widths: first.map((k) => Math.round((k.box[2] / n.box[2]) * 100)), items: num(n.s, "repeat") || kids.length };
      }
      const sameRow = kids.every((k) => overlapsVertically(k, kids[0]));
      const narrower = kids.every((k) => k.box[2] < n.box[2] * 0.85);
      if (sameRow && narrower && (display === "grid" || display === "flex")) {
        return { node: n, widths: kids.map((k) => Math.round((k.box[2] / n.box[2]) * 100)), items: kids.length };
      }
    }
    if (d < 4) for (const k of n.kids ?? []) queue.push([k, d + 1]);
  }
  return null;
}

/** Plain-language facts about one section, derived deterministically from its layout tree. */
export function summarizeSection(role: string, tree: RawNode | null): string[] {
  if (!tree) return [];
  const out: string[] = [];
  const rootBits = [
    str(tree.s, "bg") && `background ${str(tree.s, "bg")}`,
    str(tree.s, "bgImage") && `background layer ${str(tree.s, "bgImage").slice(0, 110)}`,
    str(tree.s, "border") && `border ${str(tree.s, "border")}`,
    str(tree.s, "pad") && `padding ${str(tree.s, "pad")}`,
    str(tree.s, "pos") && `${str(tree.s, "pos")}-positioned`,
    str(tree.s, "maxW") && `max width ${str(tree.s, "maxW")}`,
  ].filter(Boolean);
  if (rootBits.length) out.push(`Container: ${rootBits.join(", ")}`);

  const cols = findColumns(tree);
  if (cols) {
    const s = cols.node.s;
    out.push(
      `Layout: ${cols.widths.length}-column ${str(s, "display")}${str(s, "gap") ? ` (gap ${str(s, "gap")})` : ""}, column widths ≈ ${cols.widths.join("% / ")}%${cols.items > cols.widths.length ? `, ${cols.items} items flowing over multiple rows` : ""}${str(s, "align") ? `, items ${str(s, "align")}` : ""}`
    );
  } else {
    out.push("Layout: single column, stacked vertically");
  }

  const headings: string[] = [];
  const paragraphs: string[] = [];
  const buttons: string[] = [];
  const links: string[] = [];
  const badges: string[] = [];
  const images: string[] = [];
  const stats: string[] = [];
  const strokes = new Set<string>();
  let icons = 0;
  const decor = { glow: 0, grid: 0, ring: 0, dot: 0, floatingIcons: 0, other: 0 };
  const floatingCards: RawNode[] = [];
  const navFacts: string[] = [];
  const cards: { repeat: number; sample: RawNode }[] = [];

  walk(tree, (n, depth, parent) => {
    const pos = str(n.s, "pos");
    const floating = pos === "absolute" || pos === "fixed";

    if (n.role === "nav" && depth <= 4 && navFacts.length < 1) navFacts.push(`Nav bar: ${n.box[2]}×${n.box[3]}px${box(n) ? `, ${box(n)}` : ""}${str(n.s, "gap") ? `, gap ${str(n.s, "gap")}` : ""}`);
    if (num(n.s, "repeat") > 0 && n.kids?.[0]) cards.push({ repeat: num(n.s, "repeat"), sample: n.kids[0] });

    if (floating && !n.text) {
      const hasText = !!textOf(n);
      const bgImage = str(n.s, "bgImage");
      if (!hasText) {
        if (n.role === "icon") {
          decor.floatingIcons++;
        } else if (/gradient/.test(bgImage) && /rgba\(\d+, \d+, \d+, 0\.\d+\), rgba\(0, 0, 0, 0\) 1px|1px/.test(bgImage)) {
          decor.grid++;
        } else if (str(n.s, "filter").includes("blur") || (/gradient/.test(bgImage) && !str(n.s, "border"))) {
          decor.glow++;
        } else if (str(n.s, "border") && str(n.s, "radius") === "full") {
          decor.ring++;
        } else if (str(n.s, "bg") && str(n.s, "radius") === "full" && n.box[2] <= 16) {
          decor.dot++;
        } else {
          decor.other++;
        }
      }
    }
    if (floating && textOf(n) && (str(n.s, "bg") || str(n.s, "border")) && n.kids && n.kids.length >= 2 && n.box[2] < 400) floatingCards.push(n);

    const isStat = !!n.text && /\d/.test(n.text) && /^[\d.,]+\s?[+%kKmMbB]?\+?$/.test(n.text) && fontSize(n) >= 18;
    if (isStat && stats.length < 6) {
      stats.push(n.text!);
    } else if (n.role === "heading" || (n.text && fontSize(n) >= 20)) {
      const t = n.text || textOf(n);
      if (t && headings.length < 6) headings.push(`"${t.slice(0, 70)}" — ${describeFont(n)}${n.role === "heading" ? "" : " (large text)"}`);
    } else if (n.role === "text" && n.text) {
      const t = n.text;
      if (t.length >= 60 && paragraphs.length < 2) paragraphs.push(`"${t.slice(0, 60)}…" — ${describeFont(n)}${str(n.s, "maxW") ? `, max width ${str(n.s, "maxW")}` : ""}`);
      else if (str(n.s, "transform") === "uppercase" && fontSize(n) <= 14 && badges.length + headings.length < 12 && !str(n.s, "bg")) headings.push(`eyebrow "${t.slice(0, 40)}" — ${describeFont(n)}`);
    }
    if ((str(n.s, "bg") || str(n.s, "border")) && str(n.s, "radius") === "full" && n.box[3] < 44 && textOf(n) && n.role !== "button" && n.role !== "link" && badges.length < 4) {
      badges.push(`"${textOf(n).slice(0, 48)}" (${box(n)}; ${describeFont(n.kids?.find((k) => k.text) ?? n)})`);
    }
    if (n.role === "button" && !textOf(n)) {
      buttons.push(`icon-only button ${n.box[2]}×${n.box[3]} — ${box(n) || "no fill"}`);
    } else if (n.role === "button") {
      const fill = str(n.s, "bg") ? `filled ${str(n.s, "bg")}` : str(n.s, "border") ? "outline" : "text";
      buttons.push(`"${textOf(n).slice(0, 40)}" — ${fill}, ${box(n)}, ${describeFont(n)}`);
    } else if (n.role === "link" && depth <= 6 && (role === "header" || parent?.role === "nav" || str(parent?.s, "display") === "flex") && n.text) {
      const isCta = !!str(n.s, "bg");
      if (isCta) buttons.push(`"${n.text.slice(0, 40)}" — filled ${str(n.s, "bg")}, ${box(n)}, ${describeFont(n)}`);
      else if (links.length < 14 && n.box[3] < 60) links.push(n.text);
    }
    if (n.role === "image") images.push(`${n.box[2]}×${n.box[3]}${str(n.s, "radius") ? ` radius ${str(n.s, "radius")}` : ""}${str(n.s, "fit") ? ` ${str(n.s, "fit")}` : ""}${str(n.s, "alt") ? ` (alt "${str(n.s, "alt").slice(0, 40)}")` : ""}${str(n.s, "filter") ? ` filter ${str(n.s, "filter").slice(0, 40)}` : ""}`);
    if (n.role === "icon") {
      icons++;
      const c = str(n.s, "stroke") || str(n.s, "fill");
      if (c) strokes.add(c);
    }
  });

  out.push(...navFacts);
  if (headings.length) out.push(`Headings & labels: ${headings.join(" | ")}`);
  if (paragraphs.length) out.push(`Body text: ${paragraphs.join(" | ")}`);
  if (badges.length) out.push(`Badge/pill: ${badges.join(" | ")}`);
  if (links.length) out.push(`Links (${links.length}): ${shortList(links)}`);
  if (buttons.length) out.push(`Buttons: ${buttons.slice(0, 4).join(" | ")}`);
  if (stats.length) out.push(`Stats: ${stats.join(", ")}`);
  if (images.length) out.push(`Images: ${shortList(images, 4)}`);
  if (icons) out.push(`Icons: ${icons}${strokes.size ? ` (colors ${shortList([...strokes], 4)})` : ""}`);
  for (const c of cards.slice(0, 2)) {
    const parts: string[] = [];
    walk(c.sample, (n) => {
      if (n.role === "image") parts.push("image");
      else if (n.role === "icon") parts.push("icon");
      else if (n.role === "heading") parts.push("title");
      else if (n.role === "text" && n.text) parts.push(fontSize(n) >= 16 ? "large text" : "text");
      else if (n.role === "button") parts.push("button");
    });
    const compact = parts.filter((p, i) => parts[i - 1] !== p).slice(0, 8).join(" + ");
    const style = box(c.sample);
    if (!style && parts.length < 2) continue; // bare icons / lone text lines add nothing
    out.push(`Repeated item ×${c.repeat}: ${compact || "block"}${style ? ` — ${style}` : ""}`);
  }
  if (floatingCards.length) out.push(`Floating cards ×${floatingCards.length}: absolutely positioned, ${box(floatingCards[0])}`);
  const decorBits = [
    decor.grid && "grid-line pattern",
    decor.glow && `${decor.glow} blurred/gradient glow layer${decor.glow > 1 ? "s" : ""}`,
    decor.ring && `${decor.ring} concentric ring${decor.ring > 1 ? "s" : ""}`,
    decor.dot && `${decor.dot} small glowing dot${decor.dot > 1 ? "s" : ""}`,
    decor.floatingIcons && `${decor.floatingIcons} faint floating icon${decor.floatingIcons > 1 ? "s" : ""}`,
  ].filter(Boolean);
  if (decorBits.length) out.push(`Decoration: ${decorBits.join(", ")}`);
  return out.map((l) => (l.length > 380 ? `${l.slice(0, 377)}...` : l));
}

/** Compact text outline of a tree — far fewer tokens than JSON, and easier for a model to read. */
export function renderOutline(node: RawNode, depth = 0, isRoot = true): string {
  const s = node.s ?? {};
  const pos = str(s, "pos");
  // Size everywhere; x/y only where placement matters (the section itself, absolutely positioned pieces).
  const place = isRoot || pos === "absolute" || pos === "fixed" ? `${node.box[2]}×${node.box[3]}@${node.box[0]},${node.box[1]}` : `${node.box[2]}×${node.box[3]}`;
  const styles = Object.entries(s)
    .map(([k, v]) => `${k}=${typeof v === "string" ? v.slice(0, 110) : v}`)
    .join(" ");
  const line = `${" ".repeat(depth)}${node.role || node.tag} ${place}${node.text ? ` "${node.text}"` : ""}${styles ? ` ${styles}` : ""}`;
  return [line, ...(node.kids ?? []).map((k) => renderOutline(k, depth + 1, false))].join("\n");
}
