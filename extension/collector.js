/**
 * Injected into the analysed page (chrome.scripting.executeScript `func`). It must stay fully
 * self-contained — the function is serialised, so it can reference nothing outside its own body.
 * It measures and normalises (every colour becomes plain sRGB, translucent layers are blended onto
 * what is behind them); interpretation happens server-side in src/lib/site-to-prompt/aggregate.ts,
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

  // ---- colour normalisation -------------------------------------------------------------------
  // Modern CSS (Tailwind v4, etc.) computes to oklch()/oklab()/color-mix(); a 1x1 canvas makes the
  // browser convert any of them to sRGB for us.
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  const rgbaCache = new Map();
  const simple = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i;

  const alphaOf = (s) => {
    const m = s.match(/\/\s*([\d.]+%?)\s*\)\s*$/);
    if (!m) return null;
    return m[1].endsWith("%") ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
  };
  const rgba = (str) => {
    if (!str) return null;
    const key = str.trim();
    if (rgbaCache.has(key)) return rgbaCache.get(key);
    let out = null;
    const m = key.match(simple);
    if (m) {
      const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      out = [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3]), a];
    } else if (key === "transparent") {
      out = [0, 0, 0, 0];
    } else if (g) {
      try {
        g.clearRect(0, 0, 1, 1);
        g.fillStyle = "#010203";
        g.fillStyle = key;
        g.fillRect(0, 0, 1, 1);
        const d = g.getImageData(0, 0, 1, 1).data;
        const invalid = d[0] === 1 && d[1] === 2 && d[2] === 3 && d[3] === 255;
        if (!invalid) {
          const a = alphaOf(key);
          out = [d[0], d[1], d[2], a !== null ? a : d[3] / 255];
        }
      } catch (e) {
        out = null;
      }
    }
    rgbaCache.set(key, out);
    return out;
  };
  const hex = (c) => "#" + [c[0], c[1], c[2]].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
  const over = (base, top) => {
    const a = top[3];
    return [top[0] * a + base[0] * (1 - a), top[1] * a + base[1] * (1 - a), top[2] * a + base[2] * (1 - a), 1];
  };
  const rgbString = (c) => `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`;

  // Replaces every colour function in a gradient / shadow string with plain rgb()/rgba().
  const colorFn = /(?:oklch|oklab|lab|lch|hsla?|hwb|color-mix|color|rgba?)\((?:[^()]|\([^()]*\))*\)/gi;
  const normalizeColors = (str) =>
    str.replace(colorFn, (m) => {
      const c = rgba(m);
      if (!c) return m;
      return c[3] >= 0.995 ? hex(c) : `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${Math.round(c[3] * 100) / 100})`;
    });

  // ---- what is really painted behind an element ------------------------------------------------
  const rootScheme = getComputedStyle(document.documentElement).colorScheme || "";
  const canvasDefault = /dark/.test(rootScheme) && !/light/.test(rootScheme) ? [18, 18, 18, 1] : [255, 255, 255, 1];
  const resolvedCache = new WeakMap();
  const resolvedBg = (el) => {
    if (!el) return canvasDefault;
    const cached = resolvedCache.get(el);
    if (cached) return cached;
    const base = resolvedBg(el.parentElement);
    const own = rgba(getComputedStyle(el).backgroundColor);
    const result = own && own[3] > 0.004 ? over(base, own) : base;
    resolvedCache.set(el, result);
    return result;
  };

  // ---- elements --------------------------------------------------------------------------------
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

    const behind = resolvedBg(el);
    const own = rgba(cs.backgroundColor);
    const ownAlpha = own ? own[3] : 0;
    const parentBehind = resolvedBg(el.parentElement);

    // Text colour as actually seen: translucent text (text-white/70) blended onto its background.
    const fg = rgba(cs.color);
    const seenText = fg && fg[3] > 0.02 ? over(behind, fg) : null;

    // Border colour blended onto the parent's background.
    const bw = px(cs.borderTopWidth);
    const bc = bw > 0 ? rgba(cs.borderTopColor) : null;
    const seenBorder = bc && bc[3] > 0.02 ? over(parentBehind, bc) : null;

    const bgImage = cs.backgroundImage !== "none" ? normalizeColors(cs.backgroundImage).slice(0, 360) : "";
    const clipText = (cs.webkitBackgroundClip || cs.backgroundClip) === "text";
    const strokeC = tag === "svg" ? rgba(cs.stroke) : null;

    samples.push({
      tag,
      w: Math.round(r.width),
      h: Math.round(r.height),
      color: seenText ? rgbString(seenText) : "rgba(0, 0, 0, 0)",
      bg: ownAlpha > 0.004 ? `rgba(${Math.round(own[0])}, ${Math.round(own[1])}, ${Math.round(own[2])}, ${Math.round(ownAlpha * 1000) / 1000})` : "rgba(0, 0, 0, 0)",
      bgResolved: hex(behind),
      bgOwnAlpha: Math.round(ownAlpha * 1000) / 1000,
      bgImage,
      textGradient: clipText && bgImage.includes("gradient") ? bgImage : "",
      borderColor: seenBorder ? hex(seenBorder) : "",
      svgStroke: strokeC && strokeC[3] > 0.02 ? hex(over(behind, strokeC)) : "",
      fontFamily: cs.fontFamily.slice(0, 200),
      fontSize: px(cs.fontSize),
      fontWeight: parseInt(cs.fontWeight, 10) || 400,
      lineHeight: cs.lineHeight === "normal" ? 0 : px(cs.lineHeight),
      letterSpacing: cs.letterSpacing === "normal" ? 0 : px(cs.letterSpacing),
      radius: Math.min(px(cs.borderTopLeftRadius), 9999),
      shadow: cs.boxShadow !== "none" ? normalizeColors(cs.boxShadow).slice(0, 200) : "",
      border: bw,
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

  // ---- page background: what is really visible across the viewport ---------------------------
  const tally = new Map();
  for (let ix = 0; ix < 6; ix++) {
    for (let iy = 0; iy < 5; iy++) {
      const x = Math.round(((ix + 0.5) / 6) * window.innerWidth);
      const y = Math.round(((iy + 0.5) / 5) * window.innerHeight);
      const el = document.elementFromPoint(x, y);
      const h = hex(resolvedBg(el || document.body));
      tally.set(h, (tally.get(h) || 0) + 1);
    }
  }
  const pageBg = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];

  // ---- top-level blocks; a single giant wrapper (#__next, #root) is expanded into its children --
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
      bg: hex(resolvedBg(el)),
      display: cs.display,
      children: el.children.length,
      heading: h ? h.textContent.trim().slice(0, 80) : "",
    });
  }

  // ---- the site's own design tokens (CSS custom properties) ----------------------------------
  const names = new Set();
  const visit = (rules, depth) => {
    if (depth > 4) return;
    for (const rule of rules) {
      if (names.size > 400) return;
      if (rule.style) {
        for (let i = 0; i < rule.style.length; i++) {
          const n = rule.style[i];
          if (n.startsWith("--") && !n.startsWith("--tw-")) names.add(n);
        }
      }
      if (rule.cssRules) visit(rule.cssRules, depth + 1);
    }
  };
  for (const sheet of document.styleSheets) {
    try {
      visit(sheet.cssRules, 0);
    } catch (e) {
      // Cross-origin stylesheets can't be read — their tokens are simply skipped.
    }
  }
  const rootStyle = getComputedStyle(document.documentElement);
  const colorVars = [];
  const otherVars = [];
  for (const name of names) {
    let value = rootStyle.getPropertyValue(name).trim();
    if (!value || value.length > 120 || value.includes("var(")) continue;
    if (/^[\d.]+\s+[\d.]+%\s+[\d.]+%$/.test(value)) value = `hsl(${value})`; // shadcn-style "220 14% 96%"
    const looksColor = /^(#|rgb|hsl|oklch|oklab|lab|lch|color)/i.test(value);
    if (looksColor) {
      const c = rgba(value);
      if (c && c[3] > 0.02) colorVars.push({ name, value: c[3] >= 0.995 ? hex(c) : `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${Math.round(c[3] * 100) / 100})` });
    } else if (/(radius|font|spacing|shadow|ease|container)/i.test(name)) {
      otherVars.push({ name, value: value.slice(0, 100) });
    }
  }
  const cssVariables = colorVars.slice(0, 50).concat(otherVars.slice(0, 20));

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const bodyCs = document.body ? getComputedStyle(document.body) : null;
  const fonts = [];
  try {
    document.fonts.forEach((f) => {
      if (f.status === "loaded" && fonts.length < 12) fonts.push(f.family.replace(/["']/g, "").slice(0, 100));
    });
  } catch (e) {
    // document.fonts can be unavailable on odd pages — fonts are best-effort.
  }
  const bodyText = bodyCs ? rgba(bodyCs.color) : null;

  return {
    title: (document.title || "").slice(0, 120),
    viewportWidth: window.innerWidth,
    pageBg,
    pageColor: bodyText ? rgbString(bodyText) : "rgb(0, 0, 0)",
    themeColor: themeMeta ? (themeMeta.getAttribute("content") || "").slice(0, 40) : "",
    loadedFonts: Array.from(new Set(fonts)),
    cssVariables,
    sections,
    samples,
  };
}
