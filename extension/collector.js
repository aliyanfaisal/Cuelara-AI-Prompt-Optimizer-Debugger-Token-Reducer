/**
 * Runs before measuring: scrolls through the page so scroll-triggered reveals and lazy content appear,
 * then returns to the top. Injected like collectPageSamples, so it must be self-contained.
 */
export async function preparePage() {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const step = Math.max(400, Math.round(window.innerHeight * 0.85));
  const limit = Math.min(document.documentElement.scrollHeight, 14000);
  if (limit > window.innerHeight * 1.5) {
    for (let y = step; y < limit; y += step) {
      window.scrollTo(0, y);
      await wait(180);
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    await wait(250);
    window.scrollTo(0, 0);
    await wait(500);
  }
  return true;
}

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

  const cleanShadow = (str) =>
    normalizeColors(str)
      .split(/,(?![^(]*\))/)
      .map((l) => l.trim())
      .filter((l) => l && !/rgba\(0, 0, 0, 0\)/.test(l))
      .join(", ");

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
      shadow: cs.boxShadow !== "none" ? cleanShadow(cs.boxShadow).slice(0, 200) : "",
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

  // ---- page structure: a compact, styled tree per top-level section ------------------------------
  // The goal is enough detail to rebuild the page: what each section contains, how it is laid out
  // (flex/grid, direction, gap, columns), and how each piece is painted — not a full DOM dump.
  const round = (n) => Math.round(n);
  const fmtBox = (v) => {
    const r = v.map(round);
    if (r.every((x) => x === 0)) return "";
    if (r[0] === r[2] && r[1] === r[3]) return r[0] === r[1] ? `${r[0]}px` : `${r[0]}px ${r[1]}px`;
    return r.map((x) => `${x}px`).join(" ");
  };
  const firstFamily = (cs) => (cs.fontFamily.split(",")[0] || "").trim().replace(/^["']|["']$/g, "");
  const bodyFamily = document.body ? firstFamily(getComputedStyle(document.body)) : "";
  const headingRe = /^h[1-6]$/;
  const mediaTags = new Set(["img", "svg", "video", "canvas", "picture", "iframe"]);

  const describe = (el, origin, parentCs, depth, sb) => {
    if (sb.left <= 0 || depth > 7) return null;
    const tag = el.tagName.toLowerCase();
    if (skipTags.has(tag.toUpperCase()) || tag === "br") return null;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || (px(cs.opacity) === 0 && !sb.reveal)) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;

    let text = "";
    for (const n of el.childNodes) if (n.nodeType === 3) text += " " + n.textContent;
    text = text.replace(/\s+/g, " ").trim().slice(0, 100);

    const isMedia = mediaTags.has(tag);
    const behind = resolvedBg(el);
    const parentBehind = resolvedBg(el.parentElement);
    const s = {};

    // layout
    if (/flex|grid/.test(cs.display)) {
      s.display = cs.display.replace("inline-", "");
      if (s.display === "flex") {
        s.dir = cs.flexDirection;
        if (cs.flexWrap !== "nowrap") s.wrap = 1;
      }
      const rg = px(cs.rowGap);
      const cg = px(cs.columnGap);
      if (rg > 0 || cg > 0) s.gap = rg === cg ? `${round(rg)}px` : `${round(rg)}px ${round(cg)}px`;
      if (!/^(normal|flex-start|start)$/.test(cs.justifyContent)) s.justify = cs.justifyContent;
      if (!/^(normal|stretch)$/.test(cs.alignItems)) s.align = cs.alignItems;
      if (s.display === "grid") {
        const cols = cs.gridTemplateColumns && cs.gridTemplateColumns !== "none" ? cs.gridTemplateColumns.split(" ").length : 0;
        if (cols > 1) s.cols = cols;
      }
    }
    if (cs.position !== "static" && cs.position !== "relative") s.pos = cs.position;
    const pad = fmtBox(sides(cs, "padding"));
    if (pad) s.pad = pad;
    if (cs.maxWidth !== "none" && px(cs.maxWidth) >= 200) s.maxW = `${round(px(cs.maxWidth))}px`;

    // paint
    const own = rgba(cs.backgroundColor);
    const painted = [];
    if (own && own[3] > 0.004) {
      s.bg = own[3] >= 0.995 ? hex(own) : `rgba(${round(own[0])}, ${round(own[1])}, ${round(own[2])}, ${round(own[3] * 100) / 100})`;
      if (own[3] < 0.995) s.bgSeen = hex(over(parentBehind, own));
      painted.push("bg");
    }
    if (cs.backgroundImage !== "none") {
      if (cs.backgroundImage.includes("gradient")) s.bgImage = normalizeColors(cs.backgroundImage).slice(0, 280);
      else if (cs.backgroundImage.includes("url(")) s.bgImage = "url(image)";
      if (s.bgImage) painted.push("bgImage");
    }
    const bws = ["Top", "Right", "Bottom", "Left"].map((k) => px(cs["border" + k + "Width"]));
    if (bws.some((w) => w > 0)) {
      const seenB = (k) => {
        const c = rgba(cs["border" + k + "Color"]);
        return c && c[3] > 0.02 ? hex(over(parentBehind, c)) : "";
      };
      if (bws.every((w) => w === bws[0])) s.border = `${round(bws[0])}px ${seenB("Top")} ${cs.borderTopStyle}`.trim();
      else s.border = ["Top", "Right", "Bottom", "Left"].map((k, i) => (bws[i] > 0 ? `${k.toLowerCase()} ${round(bws[i])}px ${seenB(k)}` : "")).filter(Boolean).join(", ");
      painted.push("border");
    }
    const rad = px(cs.borderTopLeftRadius);
    if (rad > 0) s.radius = rad >= Math.min(r.width, r.height) / 2 - 1 ? "full" : `${round(rad)}px`;
    if (cs.boxShadow !== "none") {
      const sh = cleanShadow(cs.boxShadow).slice(0, 180);
      if (sh) {
        s.shadow = sh;
        painted.push("shadow");
      }
    }
    const bd = cs.backdropFilter || cs.webkitBackdropFilter || "";
    if (bd && bd !== "none") {
      s.blur = normalizeColors(bd).slice(0, 60);
      painted.push("blur");
    }
    if (cs.filter && cs.filter !== "none") s.filter = cs.filter.slice(0, 60);
    if (px(cs.opacity) < 1 && !(sb.reveal && px(cs.opacity) === 0)) s.opacity = Math.round(px(cs.opacity) * 100) / 100;

    // text
    const isControl = tag === "a" || tag === "button" || tag === "input";
    if (text || isControl) {
      const size = round(px(cs.fontSize));
      const lh = cs.lineHeight === "normal" ? 0 : round(px(cs.lineHeight));
      const ls = cs.letterSpacing === "normal" ? 0 : Math.round(px(cs.letterSpacing) * 10) / 10;
      s.font = `${size}px/${parseInt(cs.fontWeight, 10) || 400}` + (lh ? `/lh${lh}` : "") + (ls ? `/ls${ls}` : "");
      const fg = rgba(cs.color);
      const clip = (cs.webkitBackgroundClip || cs.backgroundClip) === "text";
      if (clip && s.bgImage && s.bgImage.includes("gradient")) {
        s.textGradient = s.bgImage;
        delete s.bgImage;
        const i = painted.indexOf("bgImage");
        if (i >= 0) painted.splice(i, 1);
      } else if (fg && fg[3] > 0.02) {
        s.color = hex(over(behind, fg));
      }
      if (firstFamily(cs) !== bodyFamily) s.family = firstFamily(cs);
      if (cs.textTransform !== "none") s.transform = cs.textTransform;
      if (/^(center|right)$/.test(cs.textAlign) && (!parentCs || parentCs.textAlign !== cs.textAlign)) s.textAlign = cs.textAlign;
      if (cs.fontStyle === "italic") s.italic = 1;
    }

    // media
    let media = "";
    if (tag === "img") {
      media = "image";
      s.alt = (el.getAttribute("alt") || "").slice(0, 60);
      if (cs.objectFit && cs.objectFit !== "fill") s.fit = cs.objectFit;
      if (el.naturalWidth) s.natural = `${el.naturalWidth}x${el.naturalHeight}`;
    } else if (tag === "svg") {
      media = "icon";
      const st = rgba(cs.stroke);
      if (st && st[3] > 0.02) s.stroke = hex(over(behind, st));
      const fl = rgba(cs.fill);
      if (fl && fl[3] > 0.02 && cs.fill !== "rgb(0, 0, 0)") s.fill = hex(over(behind, fl));
    } else if (isMedia) {
      media = tag;
    } else if (s.bgImage === "url(image)") {
      media = "bg-image";
    }

    // children (fewer per node the deeper we go). A run of identical siblings (card grids, link lists)
    // is described by two examples plus a count, which is clearer and far cheaper than listing them all.
    const kids = [];
    if (!isMedia) {
      const childEls = Array.from(el.children);
      // Same tag, roughly the same size and the same number of children = the same kind of item.
      const keyOf = (c) => {
        const cr = c.getBoundingClientRect();
        return c.tagName + "|" + Math.round(cr.width / 24) + "|" + Math.round(cr.height / 24) + "|" + c.children.length;
      };
      const firstKey = childEls.length ? keyOf(childEls[0]) : "";
      const same = childEls.filter((c) => keyOf(c) === firstKey).length;
      const repeated = same >= 4 && same >= childEls.length * 0.6;
      if (repeated) s.repeat = same;
      const cap = repeated ? 2 : depth >= 3 ? 8 : 14;
      for (const c of childEls) {
        if (kids.length >= cap) break;
        if (repeated && keyOf(c) !== firstKey && kids.length >= 1) continue;
        const k = describe(c, origin, cs, depth + 1, sb);
        if (k) kids.push(k);
      }
    }

    const hasPaint = painted.length > 0;
    // Bare single-child wrappers add nothing — fold them into the child.
    if (!hasPaint && !text && !isMedia && !isControl && kids.length === 1 && !s.display && !s.pos && !s.pad) return kids[0];
    // Empty, unpainted, textless boxes are just spacing.
    if (!hasPaint && !text && !isMedia && !isControl && kids.length === 0) return null;
    sb.left--;

    const cls = typeof el.className === "string" ? el.className : "";
    let role = "";
    if (headingRe.test(tag)) role = "heading";
    else if (tag === "button" || el.getAttribute("role") === "button" || (tag === "a" && /(^|[\s_-])(btn|button|cta)([\s_-]|$)/i.test(cls))) role = "button";
    else if (tag === "a") role = "link";
    else if (tag === "nav" || tag === "header" || tag === "footer" || tag === "main" || tag === "aside" || tag === "form") role = tag;
    else if (media) role = media;
    else if (tag === "input" || tag === "textarea" || tag === "select") role = "input";
    else if (tag === "ul" || tag === "ol") role = "list";
    else if (text && !kids.length) role = "text";

    const node = { tag, box: [round(r.left - origin.x), round(r.top - origin.y), round(r.width), round(r.height)] };
    if (role) node.role = role;
    if (text) node.text = text;
    if (Object.keys(s).length) node.s = s;
    if (kids.length) node.kids = kids;
    return node;
  };

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
  const candidates = (blocks.length === 1 && main && main !== blocks[0] ? Array.from(main.children) : blocks).filter((el) => {
    if (skipTags.has(el.tagName.toUpperCase())) return false;
    const cs = getComputedStyle(el);
    return cs.display !== "none" && wide(el);
  });
  // Headers, navs and footers are often narrower than the page (a floating pill) or fixed — pick them up too.
  const isFloating = (el) => /^(fixed|sticky)$/.test(getComputedStyle(el).position);
  const extras = Array.from(document.querySelectorAll("header, nav, footer, body > *, body > * > *")).filter((el) => {
    if (skipTags.has(el.tagName.toUpperCase())) return false;
    const t = el.tagName.toLowerCase();
    if (t !== "header" && t !== "nav" && t !== "footer" && !isFloating(el)) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 100 || r.height < 24 || getComputedStyle(el).display === "none") return false;
    return !candidates.some((c) => c === el || c.contains(el) || el.contains(c));
  });
  const uniqueExtras = extras.filter((el, i) => !extras.some((o, j) => j !== i && o.contains(el)));

  const scrollY = window.scrollY;
  const all2 = [...candidates.map((el) => ({ el, extra: false })), ...uniqueExtras.map((el) => ({ el, extra: true }))]
    .map(({ el }) => ({ el, y: isFloating(el) ? 0 : Math.round(el.getBoundingClientRect().top + scrollY) }))
    .sort((a, b) => a.y - b.y)
    .slice(0, 14);

  const sectionRole = (el, index, total) => {
    const t = el.tagName.toLowerCase();
    if (t === "footer" || (index === total - 1 && /©|copyright|all rights reserved/i.test(el.textContent || "")) ) return "footer";
    if (t === "header" || t === "nav" || (isFloating(el) && el.querySelector("a"))) return "header";
    if (el.querySelector("h1")) return "hero";
    return "section";
  };

  const sections = [];
  all2.forEach(({ el, y }, index) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const role = sectionRole(el, index, all2.length);
    const sb = { left: role === "hero" ? 130 : role === "header" ? 34 : role === "footer" ? 40 : 50 };
    const origin = { x: r.left, y: r.top };
    const budgetFor = () => ({ left: role === "hero" ? 130 : role === "header" ? 34 : role === "footer" ? 40 : 50 });
    let tree = describe(el, origin, null, 0, sb);
    // Sections that fade in on scroll can still sit at opacity 0 — their final layout is real, so describe it anyway.
    if ((!tree || !tree.kids) && r.height >= 100) {
      const retry = describe(el, origin, null, 0, { ...budgetFor(), reveal: true });
      if (retry) tree = retry;
    }
    const h = el.querySelector("h1, h2, h3");
    sections.push({
      tag: el.tagName.toLowerCase(),
      role,
      y,
      w: Math.round(r.width),
      h: Math.round(r.height),
      bg: hex(resolvedBg(el)),
      display: cs.display,
      children: el.children.length,
      heading: h ? h.textContent.trim().slice(0, 80) : "",
      tree,
    });
  });

  // ---- the site's own design tokens (CSS custom properties) ----------------------------------
  const names = new Set();
  const mediaTexts = new Set();
  let darkSelectors = 0;
  let lightSelectors = 0;
  let fontFaces = 0;
  let ruleBudget = 8000;
  const darkSel = /(\.dark\b|\[data-(?:bs-)?theme=["']?dark|\[data-mode=["']?dark|\.theme-dark|\.dark-mode|\.is-dark)/i;
  const lightSel = /(\.light\b|\[data-(?:bs-)?theme=["']?light|\[data-mode=["']?light|\.theme-light|\.light-mode)/i;
  const visit = (rules, depth) => {
    if (depth > 4) return;
    for (const rule of rules) {
      if (--ruleBudget <= 0 || names.size > 500) return;
      if (rule.media && rule.media.mediaText) mediaTexts.add(rule.media.mediaText);
      if (rule.selectorText) {
        if (darkSel.test(rule.selectorText)) darkSelectors++;
        if (lightSel.test(rule.selectorText)) lightSelectors++;
      }
      if (rule.constructor && rule.constructor.name === "CSSFontFaceRule") fontFaces++;
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

  // ---- tech stack & theme system -----------------------------------------------------------------
  const detectTech = () => {
    const htmlEl = document.documentElement;
    // Every class token on the page, with counts — the fingerprint of most CSS frameworks.
    const tokens = new Map();
    let total = 0;
    const classEls = document.querySelectorAll("[class]");
    for (let i = 0; i < classEls.length && i < 6000; i++) {
      const attr = classEls[i].getAttribute("class");
      if (!attr) continue;
      for (const t of attr.split(/\s+/)) {
        if (!t) continue;
        tokens.set(t, (tokens.get(t) || 0) + 1);
        total++;
      }
    }
    const countOf = (re) => {
      let n = 0;
      for (const [t, c] of tokens) if (re.test(t)) n += c;
      return n;
    };
    const uniqueOf = (re) => {
      let n = 0;
      for (const t of tokens.keys()) if (re.test(t)) n++;
      return n;
    };
    const has = (sel) => {
      try {
        return !!document.querySelector(sel);
      } catch (e) {
        return false;
      }
    };
    let resources = [];
    try {
      resources = performance.getEntriesByType("resource").slice(0, 500).map((r) => r.name);
    } catch (e) {
      // Resource timing can be unavailable — the DOM assets below still cover most cases.
    }
    const assets = Array.from(document.querySelectorAll("link[href], script[src]"))
      .slice(0, 400)
      .map((e) => e.href || e.src || "")
      .concat(resources);
    const fontFiles = resources.filter((r) => /\.(woff2?|ttf|otf)(\?|$)/i.test(r));
    const assetHas = (re) => assets.some((a) => re.test(a));
    const nameList = Array.from(names);
    const w = window;
    const out = { js: [], css: [], ui: [], styling: [], icons: [], animation: [], fonts: [], platform: [] };
    const push = (arr, v) => {
      if (v && !arr.includes(v)) arr.push(v);
    };

    // -- JS frameworks / libraries (MAIN world gives us the page's globals)
    const reactRoot = () => {
      for (const el of [document.getElementById("root"), document.getElementById("__next"), document.body && document.body.firstElementChild]) {
        if (el && Object.keys(el).some((k) => k.startsWith("__reactContainer") || k.startsWith("__reactFiber"))) return true;
      }
      return false;
    };
    const isNext = !!w.__NEXT_DATA__ || !!document.getElementById("__next") || has('script[src*="/_next/"]');
    if (isNext) push(out.js, `Next.js${w.next && w.next.version ? " " + w.next.version : ""}`);
    if (w.__NUXT__ || w.$nuxt || has("#__nuxt")) push(out.js, "Nuxt");
    if (reactRoot() || w.__REACT_DEVTOOLS_GLOBAL_HOOK__ && w.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers && w.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.size) push(out.js, "React");
    if (w.__VUE__ || w.Vue || Array.from(document.querySelectorAll("body *")).slice(0, 300).some((e) => e.__vue_app__ || e.__vue__)) push(out.js, `Vue${w.Vue && w.Vue.version ? " " + w.Vue.version : ""}`);
    if (has("[ng-version]")) push(out.js, `Angular ${document.querySelector("[ng-version]").getAttribute("ng-version")}`);
    if (has("astro-island, astro-slot") || has("[data-astro-cid]")) push(out.js, "Astro");
    if (uniqueOf(/^svelte-[a-z0-9]+$/) > 2) push(out.js, "Svelte");
    if (has("[data-reactroot]") && !out.js.includes("React")) push(out.js, "React");
    if (w.jQuery && w.jQuery.fn) push(out.js, `jQuery ${w.jQuery.fn.jquery || ""}`.trim());
    if (w.Alpine || has("[x-data]")) push(out.js, "Alpine.js");
    if (w.Livewire || has("[wire\\:id]")) push(out.js, "Livewire");
    if (w.htmx) push(out.js, "htmx");
    if (has("[data-turbo], turbo-frame") || w.Turbo) push(out.js, "Hotwire Turbo");
    if (w.Inertia || has("#app[data-page]")) push(out.js, "Inertia.js");
    if (w.Ember) push(out.js, "Ember");
    if (has('meta[name="csrf-token"]') && (has("[wire\\:id]") || has("#app[data-page]"))) push(out.platform, "Laravel");

    // -- CSS frameworks
    const twUtil = /^(?:[a-z0-9-]+:)*-?(?:flex|grid|block|inline-block|inline-flex|hidden|relative|absolute|fixed|sticky|items-[a-z]+|justify-[a-z]+|gap-[xy]?-?\d+(?:\.5)?|space-[xy]-\d+|p[xytblrse]?-\d+(?:\.5)?|m[xytblrse]?-(?:\d+(?:\.5)?|auto)|w-(?:\d+(?:\/\d+)?|full|screen|auto|fit|min|max|\[[^\]]+\])|h-(?:\d+|full|screen|auto|fit|\[[^\]]+\])|text-(?:xs|sm|base|lg|[2-9]?xl)|font-(?:thin|light|normal|medium|semibold|bold|extrabold|black|sans|serif|mono)|leading-[a-z0-9.]+|tracking-[a-z]+|rounded(?:-[a-z0-9]+)?|bg-[a-z]+(?:-\d{2,3})?(?:\/\d+)?|text-[a-z]+-\d{2,3}|border(?:-[a-z0-9]+)?|shadow(?:-[a-z]+)?|max-w-[a-z0-9]+|min-h-screen|overflow-[a-z]+|opacity-\d+|transition(?:-[a-z]+)?|duration-\d+|z-\d+|inset-\d+|top-\d+|grid-cols-\d+|col-span-\d+)$/;
    const twHits = countOf(twUtil);
    const isTailwind = twHits >= 40 && twHits / Math.max(total, 1) >= 0.3;
    let tailwindVersion = "";
    if (isTailwind || nameList.some((n) => /^--color-[a-z]+-\d{2,3}$/.test(n))) {
      const v4 = nameList.some((n) => /^--color-[a-z]+-\d{2,3}$/.test(n)) || nameList.includes("--spacing") || nameList.includes("--default-font-family");
      tailwindVersion = v4 ? "4" : "3";
    }
    if (isTailwind) push(out.css, `Tailwind CSS v${tailwindVersion || "3"}`);
    const bsCore = countOf(/^(container(-fluid)?|row|col(-(?:xs|sm|md|lg|xl|xxl))?(-\d+)?|btn|btn-[a-z-]+|navbar(-[a-z]+)?|form-control|badge|carousel|modal(-[a-z]+)?|d-(?:flex|none|block|inline)|(?:mb|mt|ms|me|px|py)-\d)$/);
    if (bsCore >= 14 && tokens.has("row") && (uniqueOf(/^col-/) > 0)) {
      const v = has("[data-bs-toggle], [data-bs-target]") || nameList.some((n) => n.startsWith("--bs-")) ? "5" : has("[data-toggle], [data-target]") ? "4" : uniqueOf(/^col-xs-/) > 0 ? "3" : "";
      const hrefV = (assets.join(" ").match(/bootstrap(?:@|\/)(\d+)/i) || [])[1];
      push(out.css, `Bootstrap${v || hrefV ? " " + (v || hrefV) : ""}`);
    }
    if (tokens.has("columns") && tokens.has("column") && uniqueOf(/^is-/) > 2) push(out.css, "Bulma");
    if (uniqueOf(/^(grid-x|grid-y|cell|small-\d+|medium-\d+|large-\d+)$/) > 4) push(out.css, "Foundation");
    if (uniqueOf(/^uk-/) > 3) push(out.css, "UIkit");
    if (tokens.has("ui") && uniqueOf(/^(segment|menu|grid|button|container)$/) > 2 && countOf(/^ui$/) > 3) push(out.css, "Semantic UI");
    if (uniqueOf(/^(materialboxed|waves-effect|z-depth-\d|card-panel)$/) > 1) push(out.css, "Materialize");
    if (uniqueOf(/^(pure-g|pure-u-[\w-]+)$/) > 1) push(out.css, "Pure.css");
    if (nameList.some((n) => /^--pico-/.test(n))) push(out.css, "Pico CSS");
    if (assetHas(/tachyons/i)) push(out.css, "Tachyons");

    // -- UI component libraries
    if (uniqueOf(/^Mui[A-Z]/) > 2) push(out.ui, "Material UI (MUI)");
    if (uniqueOf(/^chakra-/) > 1) push(out.ui, "Chakra UI");
    if (uniqueOf(/^ant-/) > 3) push(out.ui, "Ant Design");
    if (uniqueOf(/^mantine-/) > 2 || uniqueOf(/^m_[a-z0-9]{8,}$/) > 4) push(out.ui, "Mantine");
    if (has("[data-radix-collection-item], [data-radix-popper-content-wrapper], [data-radix-scroll-area-viewport]") || has('[id^="radix-"]') || has("[data-slot]")) {
      push(out.ui, isTailwind ? "Radix UI (shadcn/ui-style)" : "Radix UI");
    }
    if (has('[id^="headlessui-"]')) push(out.ui, "Headless UI");
    if (isTailwind && tokens.has("btn") && uniqueOf(/^(btn-(primary|secondary|accent|ghost|outline)|card-body|card-title|badge-[a-z]+|navbar-(start|center|end)|drawer-[a-z]+)$/) > 1) push(out.ui, "daisyUI");
    if (has("[data-drawer-target], [data-modal-target], [data-dropdown-toggle]")) push(out.ui, "Flowbite");
    if (uniqueOf(/^v-(btn|card|app|toolbar|list|container|row|col)/) > 2) push(out.ui, "Vuetify");
    if (uniqueOf(/^el-[a-z-]+/) > 3) push(out.ui, "Element Plus");
    if (uniqueOf(/^p-(button|component|inputtext|datatable)/) > 1) push(out.ui, "PrimeVue/PrimeReact");
    if (uniqueOf(/^(nextui|heroui)-/) > 1) push(out.ui, "NextUI/HeroUI");

    // -- styling approach
    if (has("style[data-emotion]") || uniqueOf(/^css-[a-z0-9]{5,8}(-[A-Za-z]+)?$/) > 4) push(out.styling, "Emotion (CSS-in-JS)");
    if (has("style[data-styled]") || uniqueOf(/^sc-[A-Za-z0-9]{6,}$/) > 3) push(out.styling, "styled-components");
    if (uniqueOf(/^[A-Za-z0-9-]+_[A-Za-z0-9-]+__[A-Za-z0-9_-]{5}$/) > 3 || uniqueOf(/^[a-z0-9-]+-module__[A-Za-z0-9_-]+__[A-Za-z0-9_-]+$/) > 3) push(out.styling, "CSS Modules");
    if (uniqueOf(/^jsx-\d{5,}$/) > 1) push(out.styling, "styled-jsx");
    if (isTailwind) push(out.styling, "Utility classes");
    if (!isTailwind && !out.css.length && !out.styling.length) push(out.styling, "Custom / semantic CSS");

    // -- icon sets
    if (uniqueOf(/^(fa|fas|far|fab|fal|fad|fa-solid|fa-regular|fa-brands)$/) > 0 && uniqueOf(/^fa-[a-z0-9-]+$/) > 1) push(out.icons, "Font Awesome");
    if (uniqueOf(/^bi-[a-z0-9-]+$/) > 1) push(out.icons, "Bootstrap Icons");
    if (has(".material-icons, .material-symbols-outlined, .material-symbols-rounded")) push(out.icons, "Material Icons");
    if (has("svg.lucide, svg[class*='lucide-']")) push(out.icons, "Lucide");
    if (has("svg.feather, svg[class*='feather-']")) push(out.icons, "Feather");
    if (has("svg[class*='tabler-icon']")) push(out.icons, "Tabler Icons");
    if (uniqueOf(/^ri-[a-z0-9-]+$/) > 1) push(out.icons, "Remix Icon");
    if (uniqueOf(/^ph(-[a-z]+)?$/) > 0 && uniqueOf(/^ph-[a-z0-9-]+$/) > 1) push(out.icons, "Phosphor");
    if (has("ion-icon")) push(out.icons, "Ionicons");
    if (uniqueOf(/^bx(-[a-z0-9-]+)?$/) > 1 && tokens.has("bx")) push(out.icons, "Boxicons");
    if (uniqueOf(/^(mdi|mdi-[a-z0-9-]+)$/) > 1) push(out.icons, "Material Design Icons");

    // -- animation / interaction libraries
    if (w.gsap || w.TweenMax || assetHas(/gsap/i)) push(out.animation, `GSAP${w.gsap && w.gsap.version ? " " + w.gsap.version : ""}`);
    if (has("[data-aos]") || w.AOS) push(out.animation, "AOS (animate on scroll)");
    if (uniqueOf(/^animate__/) > 0) push(out.animation, "animate.css");
    if (has("[data-projection-id], [data-framer-appear-id]")) push(out.animation, "Framer Motion");
    if (w.lottie || has("lottie-player, dotlottie-player, .lottie")) push(out.animation, "Lottie");
    if (has(".swiper, .swiper-container") || w.Swiper) push(out.animation, "Swiper");
    if (has(".slick-slider")) push(out.animation, "Slick carousel");
    if (w.THREE || has("canvas[data-engine*='three']")) push(out.animation, "Three.js");
    if (has("[data-scroll-container], .locomotive-scroll") || w.Lenis) push(out.animation, "Smooth scroll (Lenis/Locomotive)");
    if (has("[class*='reveal']") && !out.animation.length) push(out.animation, "Scroll-reveal (custom)");

    // -- fonts
    if (assetHas(/fonts\.googleapis\.com|fonts\.gstatic\.com/i)) push(out.fonts, "Google Fonts");
    if (assetHas(/use\.typekit\.net|fonts\.adobe\.com/i)) push(out.fonts, "Adobe Fonts");
    if (assetHas(/fonts\.bunny\.net/i)) push(out.fonts, "Bunny Fonts");
    if (assetHas(/fontshare\.com/i)) push(out.fonts, "Fontshare");
    if (assetHas(/cdnfonts\.com|fonts\.com|myfonts/i)) push(out.fonts, "Web font CDN");
    if (fontFiles.some((f) => { try { return new URL(f).origin === location.origin; } catch (e) { return false; } })) push(out.fonts, "Self-hosted font files");
    else if (fontFaces > 0 && !out.fonts.length) push(out.fonts, "Self-hosted @font-face");
    if (assetHas(/\/_next\/static\/media\/.*\.woff2?/i) || tokens.has("__className_") ) push(out.fonts, "next/font (self-hosted)");
    // A declared family with no font file behind it renders as whatever is installed locally (or a fallback).
    let loadedCount = 0;
    try {
      document.fonts.forEach((f) => { if (f.status === "loaded") loadedCount++; });
    } catch (e) {
      loadedCount = fontFiles.length;
    }
    if (!out.fonts.length && loadedCount === 0 && fontFiles.length === 0) push(out.fonts, "No web-font files loaded (system / locally installed fonts)");

    // -- CMS / platform
    const gen = (document.querySelector('meta[name="generator"]') || {}).content || "";
    if (gen) push(out.platform, gen.slice(0, 40));
    if (assetHas(/\/wp-content\/|\/wp-includes\//i) || has('link[rel="https://api.w.org/"]')) push(out.platform, "WordPress");
    if (uniqueOf(/^elementor-/) > 2) push(out.platform, "Elementor");
    if (assetHas(/cdn\.shopify\.com/i) || w.Shopify) push(out.platform, "Shopify");
    if (has("html[data-wf-page]") || uniqueOf(/^w-(nav|container|col|button)/) > 2) push(out.platform, "Webflow");
    if (assetHas(/parastorage\.com|wixstatic\.com/i)) push(out.platform, "Wix");
    if (assetHas(/squarespace/i)) push(out.platform, "Squarespace");
    if (assetHas(/framerusercontent\.com/i) || has("[data-framer-name]")) push(out.platform, "Framer");
    if (uniqueOf(/^woocommerce/) > 0) push(out.platform, "WooCommerce");

    // -- responsive breakpoints from media queries
    const bpTally = new Map();
    let prefersDark = 0;
    let prefersLight = 0;
    for (const m of mediaTexts) {
      if (/prefers-color-scheme:\s*dark/.test(m)) prefersDark++;
      if (/prefers-color-scheme:\s*light/.test(m)) prefersLight++;
      for (const mm of m.matchAll(/\((?:min|max)-width:\s*([\d.]+)(px|em|rem)\)/g)) {
        const px2 = Math.round(parseFloat(mm[1]) * (mm[2] === "px" ? 1 : 16));
        if (px2 >= 320 && px2 <= 2000) bpTally.set(px2, (bpTally.get(px2) || 0) + 1);
      }
    }
    const breakpoints = [...bpTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map((e) => e[0]).sort((a, b) => a - b);

    // -- light / dark theme system
    const htmlCls = htmlEl.classList;
    const themeAttrName = ["data-theme", "data-bs-theme", "data-mode", "data-color-mode", "data-color-scheme", "data-mui-color-scheme", "data-joy-color-scheme", "data-theme-mode"].find((a) => htmlEl.hasAttribute(a) || (document.body && document.body.hasAttribute(a)));
    const themeAttrEl = themeAttrName ? (htmlEl.hasAttribute(themeAttrName) ? htmlEl : document.body) : null;
    const themeAttrVal = themeAttrName ? themeAttrEl.getAttribute(themeAttrName) : "";
    const classTheme = ["dark", "light"].find((c) => htmlCls.contains(c)) || (document.body && ["dark", "light"].find((c) => document.body.classList.contains(c))) || "";
    const hasDarkVariant = countOf(/^dark:/) > 0;
    let mechanism = "none";
    if (classTheme || darkSelectors > 0 || hasDarkVariant && !prefersDark) mechanism = "class";
    if (themeAttrName && /^(dark|light|auto|system)$/i.test(themeAttrVal || "")) mechanism = "attribute";

    if (mechanism === "none" && prefersDark > 0) mechanism = "media-query";
    const toggleEl = Array.from(document.querySelectorAll("button, [role='switch'], input[type='checkbox'], label, a[aria-label], a[title]"))
      .slice(0, 400)
      .find((e) => {
        const label = (e.getAttribute("aria-label") || "") + " " + (e.getAttribute("title") || "");
        if (/(theme|dark mode|light mode|color mode|colour mode|appearance|switch to (dark|light)|toggle (dark|light))/i.test(label)) return true;
        if (e.tagName === "A" || e.tagName === "LABEL") return false;
        const idCls = (e.id || "") + " " + (typeof e.className === "string" ? e.className : "");
        return /(theme-?(toggle|switch|selector)|dark-?mode|color-?mode|mode-?(toggle|switch)|appearance)/i.test(idCls) || !!e.querySelector("svg.lucide-sun, svg.lucide-moon, .fa-moon, .fa-sun, .bi-moon, .bi-sun, .bi-moon-stars, [data-icon='moon'], [data-icon='sun']");
      });
    const storedTheme = (() => {
      try {
        for (const k of ["theme", "color-theme", "color-mode", "vueuse-color-scheme", "chakra-ui-color-mode", "mantine-color-scheme-value", "darkMode"]) {
          const v = localStorage.getItem(k);
          if (v) return `${k}=${v}`.slice(0, 60);
        }
      } catch (e) {
        // storage can be blocked — the theme mechanism is still detectable without it.
      }
      return "";
    })();
    const schemeMeta = (document.querySelector('meta[name="color-scheme"]') || {}).content || "";
    const scheme = getComputedStyle(htmlEl).colorScheme;
    const currentMode = luminanceOf(pageBg) < 0.25 ? "dark" : "light";

    // Flip the theme briefly (transitions off) to read the other palette, then put everything back.
    let alternate = null;
    if (mechanism === "class" || mechanism === "attribute") {
      const kill = document.createElement("style");
      kill.textContent = "*,*::before,*::after{transition:none!important;animation:none!important}";
      const restore = [];
      try {
        document.head.appendChild(kill);
        if (mechanism === "class") {
          const target = htmlCls.contains("dark") || htmlCls.contains("light") || !document.body || !(document.body.classList.contains("dark") || document.body.classList.contains("light")) ? htmlEl : document.body;
          const before = target.className;
          restore.push(() => { target.className = before; });
          const wasDark = target.classList.contains("dark") || currentMode === "dark";
          if (wasDark) { target.classList.remove("dark"); target.classList.add("light"); } else { target.classList.remove("light"); target.classList.add("dark"); }
        } else {
          const before = themeAttrEl.getAttribute(themeAttrName);
          restore.push(() => themeAttrEl.setAttribute(themeAttrName, before));
          themeAttrEl.setAttribute(themeAttrName, currentMode === "dark" ? "light" : "dark");
        }
        void document.body.offsetHeight;
        const fresh = (el) => {
          const chain = [];
          for (let e = el; e; e = e.parentElement) chain.push(e);
          let base = canvasDefault;
          for (let i = chain.length - 1; i >= 0; i--) {
            const c = rgba(getComputedStyle(chain[i]).backgroundColor);
            if (c && c[3] > 0.004) base = over(base, c);
          }
          return base;
        };
        const counts = new Map();
        for (let ix = 0; ix < 6; ix++) {
          for (let iy = 0; iy < 5; iy++) {
            const el = document.elementFromPoint(Math.round(((ix + 0.5) / 6) * window.innerWidth), Math.round(((iy + 0.5) / 5) * window.innerHeight));
            const h = hex(fresh(el || document.body));
            counts.set(h, (counts.get(h) || 0) + 1);
          }
        }
        const altBg = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
        const bodyFg = rgba(getComputedStyle(document.body).color);
        const altText = bodyFg ? hex(over(rgba(altBg) || canvasDefault, bodyFg)) : "";
        const heading = document.querySelector("h1, h2");
        const hFg = heading ? rgba(getComputedStyle(heading).color) : null;
        alternate = {
          mode: luminanceOf(altBg) < 0.25 ? "dark" : "light",
          background: altBg,
          text: altText,
          heading: hFg && hFg[3] > 0.02 ? hex(over(rgba(altBg) || canvasDefault, hFg)) : "",
        };
      } catch (e) {
        alternate = null;
      } finally {
        for (const r of restore) {
          try { r(); } catch (e2) { /* best effort */ }
        }
        kill.remove();
      }
    }

    return {
      js: out.js.slice(0, 6),
      css: out.css.slice(0, 4),
      ui: out.ui.slice(0, 4),
      styling: out.styling.slice(0, 4),
      icons: out.icons.slice(0, 4),
      animation: out.animation.slice(0, 5),
      fonts: out.fonts.slice(0, 4),
      platform: out.platform.slice(0, 4),
      lang: (htmlEl.getAttribute("lang") || "").slice(0, 12),
      dir: htmlEl.getAttribute("dir") || "ltr",
      viewportMeta: !!document.querySelector('meta[name="viewport"]'),
      breakpoints,
      theme: {
        current: currentMode,
        mechanism,
        detail: (classTheme ? `class "${classTheme}" on <${htmlCls.contains(classTheme) ? "html" : "body"}>` : "") + (themeAttrName ? `${classTheme ? "; " : ""}${themeAttrName}="${(themeAttrVal || "").slice(0, 20)}"` : ""),
        hasDarkVariant: hasDarkVariant || darkSelectors > 0 || prefersDark > 0,
        hasLightVariant: lightSelectors > 0 || prefersLight > 0 || mechanism !== "none",
        toggle: !!toggleEl,
        stored: storedTheme,
        colorScheme: (schemeMeta || (scheme && scheme !== "normal" ? scheme : "")).slice(0, 30),
        alternate,
      },
    };
  };

  const luminanceOf = (h) => {
    const c = rgba(h);
    if (!c) return 1;
    const lin = (v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  };

  let tech = null;
  try {
    tech = detectTech();
  } catch (e) {
    // Detection is an extra — a failure here must never lose the measurements.
    tech = null;
  }

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
    tech,
    sections,
    samples,
  };
}
