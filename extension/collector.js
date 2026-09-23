/**
 * Injected into the analysed page (chrome.scripting.executeScript `func`). It must stay fully
 * self-contained — the function is serialised, so it can reference nothing outside its own body.
 * It only measures; every interpretation happens server-side in src/lib/site-to-prompt/aggregate.ts,
 * so tuning the analysis never needs an extension update.
 */
export function collectPageSamples() {
  const MAX_NODES = 4000;
  const px = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  const skipTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "PATH", "DEFS", "LINK", "META", "HEAD", "TEMPLATE"]);
  const sides = (cs, p) => ["Top", "Right", "Bottom", "Left"].map((s) => px(cs[p + s]));

  const samples = [];
  const all = document.body ? document.body.querySelectorAll("*") : [];
  for (let i = 0; i < all.length && samples.length < MAX_NODES; i++) {
    const el = all[i];
    if (skipTags.has(el.tagName.toUpperCase())) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || px(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;

    let textLen = 0;
    for (const n of el.childNodes) if (n.nodeType === 3) textLen += n.textContent.trim().length;

    const cls = typeof el.className === "string" ? el.className : "";
    const tag = el.tagName.toLowerCase();
    const isLink = tag === "a";
    const isButton =
      tag === "button" ||
      el.getAttribute("role") === "button" ||
      (tag === "input" && /^(submit|button)$/i.test(el.getAttribute("type") || "")) ||
      (isLink && /(^|[\s_-])(btn|button|cta)([\s_-]|$)/i.test(cls));

    const cols = cs.gridTemplateColumns && cs.gridTemplateColumns !== "none" ? cs.gridTemplateColumns.split(" ").length : 0;
    const bd = cs.backdropFilter || cs.webkitBackdropFilter || "";

    samples.push({
      tag,
      w: Math.round(r.width),
      h: Math.round(r.height),
      color: cs.color,
      bg: cs.backgroundColor,
      bgImage: cs.backgroundImage !== "none" ? cs.backgroundImage.slice(0, 240) : "",
      fontFamily: cs.fontFamily.slice(0, 200),
      fontSize: px(cs.fontSize),
      fontWeight: parseInt(cs.fontWeight, 10) || 400,
      lineHeight: cs.lineHeight === "normal" ? 0 : px(cs.lineHeight),
      radius: px(cs.borderTopLeftRadius),
      shadow: cs.boxShadow !== "none" ? cs.boxShadow.slice(0, 160) : "",
      border: px(cs.borderTopWidth),
      padding: sides(cs, "padding"),
      margin: sides(cs, "margin"),
      gap: px(cs.columnGap) || px(cs.rowGap),
      display: cs.display,
      gridColumns: cols,
      maxWidth: cs.maxWidth === "none" ? 0 : px(cs.maxWidth),
      textLen,
      children: el.children.length,
      isButton,
      isLink,
      backdropBlur: bd.includes("blur"),
    });
  }

  // Top-level blocks; a single giant wrapper (very common: #__next, #root) is expanded into its children.
  const wide = (el) => {
    const r = el.getBoundingClientRect();
    return r.width >= window.innerWidth * 0.5 && r.height >= 40;
  };
  const expand = (el, depth) => {
    const kids = Array.from(el.children).filter((c) => !skipTags.has(c.tagName.toUpperCase()) && wide(c));
    const isWrapper = el.getBoundingClientRect().height > window.innerHeight * 2.5 && kids.length >= 2;
    if (!isWrapper || depth >= 3) return [el];
    return kids.flatMap((k) => (kids.length === 1 ? expand(k, depth + 1) : [k]));
  };
  const top = document.body ? Array.from(document.body.children) : [];
  const blocks = top.flatMap((el) => (skipTags.has(el.tagName.toUpperCase()) ? [] : expand(el, 0)));
  const main = document.querySelector("main");
  const finalBlocks = blocks.length === 1 && main && main !== blocks[0] ? Array.from(main.children) : blocks;

  const sections = [];
  for (const el of finalBlocks) {
    if (sections.length >= 14) break;
    if (skipTags.has(el.tagName.toUpperCase())) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || !wide(el)) continue;
    const h = el.querySelector("h1, h2, h3");
    sections.push({
      tag: el.tagName.toLowerCase(),
      h: Math.round(el.getBoundingClientRect().height),
      bg: cs.backgroundColor,
      display: cs.display,
      children: el.children.length,
      heading: h ? h.textContent.trim().slice(0, 80) : "",
    });
  }

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const bodyCs = document.body ? getComputedStyle(document.body) : null;
  const htmlCs = getComputedStyle(document.documentElement);
  const fonts = [];
  try {
    document.fonts.forEach((f) => {
      if (f.status === "loaded" && fonts.length < 12) fonts.push(f.family.replace(/["']/g, "").slice(0, 100));
    });
  } catch (e) {
    // document.fonts can be unavailable on odd pages — fonts are best-effort.
  }

  return {
    title: (document.title || "").slice(0, 120),
    viewportWidth: window.innerWidth,
    pageBg: bodyCs && bodyCs.backgroundColor !== "rgba(0, 0, 0, 0)" ? bodyCs.backgroundColor : htmlCs.backgroundColor,
    pageColor: bodyCs ? bodyCs.color : htmlCs.color,
    themeColor: themeMeta ? (themeMeta.getAttribute("content") || "").slice(0, 40) : "",
    loadedFonts: Array.from(new Set(fonts)),
    sections,
    samples,
  };
}
