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
