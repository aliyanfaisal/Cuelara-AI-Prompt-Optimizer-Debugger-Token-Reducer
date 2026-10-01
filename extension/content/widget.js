// The Cuelara field widget. Registered by the background worker on AI sites and on sites the user allowed, or injected
// once into the current tab when the user activates it from the popup. It is a classic script (content scripts can't be
// ES modules), so the tool list is repeated here from lib/tools.js.
//
// It never reads a field until the user picks a tool, ignores password / payment / search fields, and runs entirely
// inside a closed shadow root so the page's CSS and scripts can't reach it.
(() => {
  if (window.__cuelaraWidget) return;
  window.__cuelaraWidget = true;

  const TOOLS = [
    { id: "optimize", name: "Optimize", usageId: "prompt-optimizer", icon: '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>' },
    { id: "build", name: "Build", usageId: "prompt-builder", icon: '<path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="m17.8 11.8 1.2 1.2"/><path d="m17.8 6.2 1.2-1.2"/><path d="m3 21 9-9"/><path d="m12.2 6.2-1.2-1.2"/>' },
    { id: "compress", name: "Compress", usageId: "token-optimizer", icon: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>' },
    { id: "format", name: "Format", usageId: "prompt-formatter", icon: '<path d="M12 19h8"/><path d="m4 17 6-6-6-6"/>' },
    { id: "debug", name: "Debug", usageId: "prompt-debugger", icon: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>' },
  ];

  const BTN = 30;
  const NEVER = /search|password|passcode|otp|cvv|cvc|card.?number|ssn|captcha/i;
  const ac = new AbortController();
  const on = (target, type, fn, opts) => target.addEventListener(type, fn, { ...opts, signal: ac.signal });

  let field = null; // the field the button is attached to
  let lastField = null; // most recent usable field, so the popup can act on it after taking focus
  let menuOpen = false;
  let busy = false;
  let undo = null; // { el, text }
  let toastTimer = 0;
  let state = null; // cached { connected, account }

  // ---------------------------------------------------------------- field detection

  function rootEditable(el) {
    let r = el;
    while (r.parentElement && r.parentElement.isContentEditable) r = r.parentElement;
    return r;
  }

  function usable(el) {
    if (el.matches && el.matches("[data-cuelara-ignore], [aria-readonly='true'], [aria-disabled='true']")) return false;
    if (el.disabled || el.readOnly) return false;
    if (el.closest && el.closest("form[role='search'], [role='search']")) return false;
    if (el.getAttribute) {
      const auto = (el.getAttribute("autocomplete") || "").toLowerCase();
      if (auto.startsWith("cc-") || auto.includes("password") || auto === "one-time-code") return false;
      const hint = [el.getAttribute("aria-label"), el.getAttribute("placeholder"), el.getAttribute("name"), el.id, el.getAttribute("type")].filter(Boolean).join(" ");
      if (NEVER.test(hint)) return false;
    }
    const r = el.getBoundingClientRect();
    return r.width >= 180 && r.height >= 32;
  }

  // Single-line <input>s are never offered: chat boxes are multi-line, and inputs are mostly names, searches and logins.
  function candidateFrom(node) {
    if (!(node instanceof HTMLElement) || node.closest("#cuelara-root")) return null;
    if (node instanceof HTMLTextAreaElement) return usable(node) ? node : null;
    if (node instanceof HTMLInputElement) return null;
    if (node.isContentEditable) {
      const root = rootEditable(node);
      return usable(root) ? root : null;
    }
    const box = node.closest("[role='textbox']");
    return box && usable(box) ? box : null;
  }

  // ---------------------------------------------------------------- reading and writing the field

  function getText(el) {
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el.value;
    return (el.innerText || "").replace(/\n$/, "");
  }

  const squash = (s) => s.replace(/\s+/g, " ").trim();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function selectAll(el) {
    el.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /**
   * Replaces the field's text in a way the page's own editor notices. Rich editors (ProseMirror, Lexical, Slate…) keep
   * their own document and ignore direct DOM edits, so the text goes in through events they handle: a paste first, then
   * insertText. Returns true only if the field really holds the new text afterwards.
   */
  async function setText(el, text) {
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, text); // bypasses React's value tracking
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return squash(el.value) === squash(text);
    }

    const matches = () => squash(getText(el)) === squash(text);

    selectAll(el);
    try {
      const data = new DataTransfer();
      data.setData("text/plain", text);
      el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    } catch {
      // Falls through to insertText.
    }
    await sleep(120);
    if (matches()) return true;

    selectAll(el);
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      if (i > 0) document.execCommand("insertLineBreak");
      if (line) document.execCommand("insertText", false, line);
    });
    await sleep(120);
    return matches();
  }

  // ---------------------------------------------------------------- messaging

  async function send(message) {
    try {
      if (!chrome.runtime || !chrome.runtime.id) throw new Error("gone");
      return await chrome.runtime.sendMessage(message);
    } catch {
      // The extension was reloaded or removed: this copy of the script is orphaned.
      destroy();
      return null;
    }
  }

  async function loadState() {
    const res = await send({ type: "getState" });
    if (res) state = res;
    return state;
  }

  // ---------------------------------------------------------------- UI (closed shadow root)

  const host = document.createElement("div");
  host.id = "cuelara-root";
  host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
  const shadow = host.attachShadow({ mode: "closed" });
  shadow.innerHTML = `
<style>
  :host { all: initial; }
  * { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  .layer { position: fixed; pointer-events: none; }
  .layer > * { pointer-events: auto; }
  :root, .layer { --bg:#fff; --text:#16161d; --muted:#6b6b78; --border:#e4e4ea; --hover:#f4f4f7; --accent:#c026d3; --danger:#dc2626; }
  @media (prefers-color-scheme: dark) { .layer { --bg:#1b1b23; --text:#f2f2f5; --muted:#9a9aa8; --border:#2f2f3b; --hover:#26262f; --danger:#f87171; } }
  button { font: inherit; color: inherit; cursor: pointer; }
  .fab { width: ${BTN}px; height: ${BTN}px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg);
    box-shadow: 0 2px 10px rgba(0,0,0,.18); display: grid; place-items: center; padding: 0; transition: transform .12s, box-shadow .12s; }
  .fab:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,.24); }
  .fab:focus-visible, .item:focus-visible, .link:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .fab svg { width: 18px; height: 18px; }
  .fab.busy svg { animation: spin 1.1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .menu { position: absolute; width: 214px; padding: 6px; border-radius: 14px; border: 1px solid var(--border); background: var(--bg);
    color: var(--text); box-shadow: 0 12px 32px rgba(0,0,0,.28); }
  .head { padding: 6px 8px 8px; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
  .item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px; border: 0; border-radius: 9px; background: none; text-align: left; font-size: 13px; font-weight: 600; }
  .item:hover:not(:disabled) { background: var(--hover); }
  .item:disabled { opacity: .55; cursor: default; }
  .item svg { width: 16px; height: 16px; flex: none; color: var(--accent); fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .item .left { margin-left: auto; font-size: 11px; font-weight: 500; color: var(--muted); }
  .foot { margin-top: 4px; padding: 8px 8px 4px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 6px; }
  .link { background: none; border: 0; padding: 0; text-align: left; font-size: 11.5px; color: var(--muted); }
  .link:hover { color: var(--text); text-decoration: underline; }
  .toast { position: absolute; max-width: 280px; padding: 9px 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg);
    color: var(--text); font-size: 12.5px; line-height: 1.4; box-shadow: 0 8px 24px rgba(0,0,0,.25); display: flex; gap: 10px; align-items: center; }
  .toast.error { border-color: var(--danger); }
  .toast button { border: 0; background: none; font-weight: 700; font-size: 12.5px; color: var(--accent); padding: 0; }
  [hidden] { display: none !important; }
</style>
<div class="layer" id="layer">
  <button class="fab" id="fab" type="button" aria-label="Cuelara prompt tools" aria-haspopup="menu" hidden>
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="6.5" r="4.2" fill="#c026d3"/><circle cx="6.5" cy="16" r="4.2" fill="#a21caf"/><circle cx="17.5" cy="16" r="4.2" fill="#7e22ce"/></svg>
  </button>
  <div class="menu" id="menu" role="menu" hidden></div>
  <div class="toast" id="toast" role="status" hidden></div>
</div>`;

  const layer = shadow.getElementById("layer");
  const fab = shadow.getElementById("fab");
  const menu = shadow.getElementById("menu");
  const toast = shadow.getElementById("toast");
  // Keep the page's text selection and caret where they are when our controls are pressed.
  on(layer, "mousedown", (e) => e.preventDefault(), { capture: true });

  function mount() {
    if (!host.isConnected) document.documentElement.appendChild(host);
  }

  function place() {
    if (!field || !field.isConnected) return hideAll();
    const r = field.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || r.width === 0) return (fab.hidden = true), closeMenu();
    const x = Math.max(8, Math.min(r.right - BTN - 8, innerWidth - BTN - 8));
    const y = Math.max(8, Math.min(r.bottom - BTN - 8, innerHeight - BTN - 8));
    fab.hidden = false;
    fab.style.cssText = `position:fixed;left:${x}px;top:${y}px;`;
    if (menuOpen) positionMenu(x, y);
    if (!toast.hidden) positionToast(x, y);
  }

  function positionMenu(x, y) {
    const h = menu.offsetHeight || 260;
    const w = menu.offsetWidth || 214;
    const above = y - h - 8 >= 8;
    menu.style.left = `${Math.max(8, Math.min(x + BTN - w, innerWidth - w - 8))}px`;
    menu.style.top = `${above ? y - h - 8 : Math.min(y + BTN + 8, innerHeight - h - 8)}px`;
  }

  function positionToast(x, y) {
    const w = toast.offsetWidth || 240;
    const h = toast.offsetHeight || 40;
    toast.style.left = `${Math.max(8, Math.min(x + BTN - w, innerWidth - w - 8))}px`;
    toast.style.top = `${y - h - 10 >= 8 ? y - h - 10 : Math.min(y + BTN + 10, innerHeight - h - 8)}px`;
  }

  function hideAll() {
    fab.hidden = true;
    closeMenu();
    hideToast();
  }

  function showToast(text, { error = false, undoable = false } = {}) {
    clearTimeout(toastTimer);
    toast.className = `toast${error ? " error" : ""}`;
    toast.replaceChildren(document.createTextNode(text));
    if (undoable) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = "Undo";
      b.addEventListener("click", doUndo);
      toast.append(b);
    }
    toast.hidden = false;
    place();
    toastTimer = setTimeout(hideToast, error ? 7000 : 6000);
  }

  function hideToast() {
    clearTimeout(toastTimer);
    toast.hidden = true;
  }

  function leftLabel(tool) {
    const row = state && state.account && Array.isArray(state.account.usage) ? state.account.usage.find((u) => u.id === tool.usageId) : null;
    if (!row || !row.limit) return "";
    return `${Math.max(0, row.limit - row.used)} left`;
  }

  function renderMenu() {
    menu.replaceChildren();
    const head = document.createElement("div");
    head.className = "head";
    head.textContent = "Cuelara";
    menu.append(head);
    for (const tool of TOOLS) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "item";
      b.setAttribute("role", "menuitem");
      b.disabled = busy;
      b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${tool.icon}</svg>`;
      b.append(document.createTextNode(tool.name));
      const left = leftLabel(tool);
      if (left) {
        const s = document.createElement("span");
        s.className = "left";
        s.textContent = left;
        b.append(s);
      }
      b.addEventListener("click", () => runOnField(tool.id, field));
      menu.append(b);
    }
    const foot = document.createElement("div");
    foot.className = "foot";
    const connect = document.createElement("button");
    connect.type = "button";
    connect.className = "link";
    if (state && state.connected) {
      connect.textContent = "Open Cuelara";
      connect.addEventListener("click", () => window.open("https://cuelara.com/tools", "_blank", "noopener"));
    } else {
      connect.textContent = "Connect account for higher limits";
      connect.addEventListener("click", () => {
        closeMenu();
        showToast("Click the Cuelara icon in your toolbar and choose Connect.");
      });
    }
    const block = document.createElement("button");
    block.type = "button";
    block.className = "link";
    block.textContent = "Don’t show on this site";
    block.addEventListener("click", blockSite);
    foot.append(connect, block);
    menu.append(foot);
  }

  async function openMenu() {
    if (!field) return;
    menuOpen = true;
    hideToast();
    renderMenu();
    menu.hidden = false;
    place();
    fab.setAttribute("aria-expanded", "true");
    await loadState();
    if (menuOpen) {
      renderMenu();
      place();
    }
  }

  function closeMenu() {
    menuOpen = false;
    menu.hidden = true;
    fab.setAttribute("aria-expanded", "false");
  }

  function setBusy(value) {
    busy = value;
    fab.classList.toggle("busy", value);
    if (menuOpen) renderMenu();
  }

  // ---------------------------------------------------------------- actions

  async function runOnField(toolId, el) {
    if (busy) return { ok: false, error: "Already working on a prompt." };
    if (!el || !el.isConnected) return { ok: false, error: "Click into a text box first." };
    const original = getText(el);
    if (!original.trim()) {
      closeMenu();
      showToast("Type something in the box first, then choose a tool.", { error: true });
      return { ok: false, error: "The text box is empty." };
    }
    closeMenu();
    setBusy(true);
    const res = await send({ type: "runTool", tool: toolId, text: original });
    setBusy(false);
    if (!res) return { ok: false, error: "The extension isn't responding." };
    if (!res.ok) {
      showToast(res.error || "Something went wrong. Please try again.", { error: true });
      return { ok: false, error: res.error };
    }
    const written = await setText(el, res.text);
    if (!written) {
      // The page's editor refused the edit. Put the original back and hand the result over via the clipboard instead.
      await setText(el, original);
      let copied = false;
      try {
        await navigator.clipboard.writeText(res.text);
        copied = true;
      } catch {
        // Clipboard blocked: nothing more to do.
      }
      showToast(copied ? "This box wouldn’t accept the edit, so the result is copied. Paste it with Ctrl/Cmd+V." : "This box wouldn’t accept the edit.", { error: true });
      return { ok: false, error: "The page didn't accept the edit.", copied };
    }
    undo = { el, text: original };
    showToast(res.note ? `Done · ${res.note}` : "Done", { undoable: true });
    return { ok: true, note: res.note || "" };
  }

  async function doUndo() {
    if (!undo || !undo.el.isConnected) return hideToast();
    const { el, text } = undo;
    undo = null;
    const ok = await setText(el, text);
    showToast(ok ? "Restored your original text." : "Couldn’t restore the text. Try your browser’s undo (Ctrl/Cmd+Z).", { error: !ok });
  }

  async function blockSite() {
    closeMenu();
    const res = await send({ type: "blockThisSite" });
    if (res && res.ok) {
      showToast("Cuelara is off on this site. Turn it back on from the toolbar popup.");
      setTimeout(destroy, 3500);
    } else {
      showToast("Couldn’t block this site. Please try again.", { error: true });
    }
  }

  function destroy() {
    ac.abort();
    clearTimeout(toastTimer);
    host.remove();
    delete window.__cuelaraWidget;
  }

  // ---------------------------------------------------------------- wiring

  function attach(el) {
    if (el === field) return;
    field = el;
    lastField = el;
    mount();
    closeMenu();
    place();
  }

  on(document, "focusin", (e) => {
    const target = e.composedPath ? e.composedPath()[0] : e.target;
    const el = candidateFrom(target);
    if (el) attach(el);
  }, { capture: true });

  on(document, "focusout", () => {
    // Wait for focus to settle: clicking our own button must not hide it.
    setTimeout(() => {
      if (menuOpen || busy) return;
      const active = document.activeElement;
      if (field && (active === field || field.contains(active))) return;
      field = null;
      hideAll();
    }, 160);
  }, { capture: true });

  on(fab, "click", () => (menuOpen ? closeMenu() : openMenu()));
  on(document, "pointerdown", (e) => {
    if (menuOpen && !e.composedPath().includes(host)) closeMenu();
  }, { capture: true });
  on(document, "keydown", (e) => {
    if (e.key === "Escape" && menuOpen) closeMenu();
  }, { capture: true });

  let frame = 0;
  const reposition = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (field) place();
    });
  };
  on(window, "scroll", reposition, { capture: true, passive: true });
  on(window, "resize", reposition);
  if (typeof ResizeObserver === "function") {
    const ro = new ResizeObserver(reposition);
    ro.observe(document.documentElement);
    ac.signal.addEventListener("abort", () => ro.disconnect());
  }

  // The field may already be focused when this script is injected (activation from the popup).
  const initial = document.activeElement ? candidateFrom(document.activeElement) : null;
  if (initial) attach(initial);

  // Requests from the extension popup ("Use on this page").
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id || !message) return false;
    if (message.type === "cuelara:ping") {
      sendResponse({ ok: true, hasField: !!(lastField && lastField.isConnected) });
      return false;
    }
    if (message.type === "cuelara:run" && TOOLS.some((t) => t.id === message.tool)) {
      const el = lastField && lastField.isConnected ? lastField : null;
      if (!el) {
        sendResponse({ ok: false, error: "Click into a text box on the page first, then try again." });
        return false;
      }
      field = el;
      mount();
      place();
      runOnField(message.tool, el).then(sendResponse);
      return true;
    }
    return false;
  });
})();
