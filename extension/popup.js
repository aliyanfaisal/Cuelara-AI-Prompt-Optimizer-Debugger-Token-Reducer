import { MEASURE_ERROR, measureTab, openToolPage, parseWebUrl, unsupportedReason } from "./shared.js";
import { getApiBase } from "./lib/config.js";
import { aiSiteFor } from "./lib/ai-sites.js";
import { matchPatternFor, normalizeDomain } from "./lib/domain.js";
import { ruleFor } from "./lib/rules.js";
import { TEXT_TOOLS } from "./lib/tools.js";

// ------------------------------------------------------------------------------------------------ icons

const ICONS = {
  optimize: '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
  build: '<path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="m17.8 11.8 1.2 1.2"/><path d="m17.8 6.2 1.2-1.2"/><path d="m3 21 9-9"/><path d="m12.2 6.2-1.2-1.2"/>',
  compress: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  format: '<path d="M12 19h8"/><path d="m4 17 6-6-6-6"/>',
  debug: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  score: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
  extract: '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.7.7l3.6 3.6A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  compare: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
  palette: '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  chev: '<path d="m9 18 6-6-6-6"/>',
  out: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  plug: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  dash: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
};

function icon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "i");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = ICONS[name] || "";
  return svg;
}

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === false || value == null) continue;
    if (key === "class") el.className = value;
    else if (key === "text") el.textContent = value;
    else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

// ------------------------------------------------------------------------------------------------ catalog

const TITLES = { optimize: "Prompt Optimizer", build: "Prompt Builder", compress: "Token Optimizer", format: "Prompt Formatter", debug: "Prompt Debugger" };

const CATALOG = [
  ...TEXT_TOOLS.map((t) => ({ id: t.id, title: TITLES[t.id], icon: t.id, purpose: t.purpose, usage: [t.usageId], page: t.page, text: true })),
  { id: "score", title: "Intelligence Score", icon: "score", purpose: "Scores a prompt from 0 to 100 for clarity and specificity, with suggestions to improve it.", usage: ["intelligence-score"], page: "/tools/intelligence-score", text: false },
  { id: "extract", title: "Context Extractor", icon: "extract", purpose: "Upload a large document and pull out only the passages that matter, to cut tokens and noise.", usage: ["context-extractor-document", "context-extractor-prompt"], page: "/tools/context-extractor", text: false },
  { id: "compare", title: "Diff & Cost Estimate", icon: "compare", purpose: "Compare two versions of a prompt and see the token and cost savings.", usage: [], page: "/tools/compare-estimate", text: false },
];

// ------------------------------------------------------------------------------------------------ state

const app = document.getElementById("app");
const state = {
  tab: null,
  tabUrl: "",
  connected: false,
  account: null,
  rules: [],
  screen: "home", // "home" | "tool"
  toolId: null,
  menuOpen: false,
  showHelp: false,
  status: {}, // { [area]: { kind: "busy" | "error" | "ok" | "info", text } }
};

const send = (message) => chrome.runtime.sendMessage(message).catch(() => null);

function applyState(next) {
  if (!next) return;
  state.connected = !!next.connected;
  state.account = next.account || null;
  state.rules = Array.isArray(next.rules) ? next.rules : [];
}

function setStatus(area, kind, text) {
  state.status[area] = text ? { kind, text } : null;
  render();
}

function usageRow(id) {
  const rows = state.account && Array.isArray(state.account.usage) ? state.account.usage : [];
  return rows.find((r) => r.id === id) || null;
}

function toolUsage(tool) {
  const rows = tool.usage.map(usageRow).filter(Boolean);
  if (rows.length === 0) return null;
  // A tool with two quotas (documents / prompts) is summarised by whichever is closer to its limit.
  return rows.reduce((a, b) => (b.limit && b.used / b.limit > (a.limit ? a.used / a.limit : 0) ? b : a));
}

function meterClass(row) {
  if (!row || !row.limit) return "meter";
  const pct = row.used / row.limit;
  return `meter${pct >= 1 ? " full" : pct >= 0.8 ? " hot" : ""}`;
}

function meter(row) {
  const pct = row && row.limit ? Math.min(100, Math.round((row.used / row.limit) * 100)) : 0;
  const bar = h("i");
  bar.style.width = `${pct}%`;
  return h("div", { class: meterClass(row), role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(pct) }, bar);
}

// ------------------------------------------------------------------------------------------------ the current page

function siteInfo() {
  const reason = state.tab ? unsupportedReason(state.tabUrl) : "No page is open.";
  if (reason) return { kind: "unsupported", reason };
  const url = parseWebUrl(state.tabUrl);
  const domain = normalizeDomain(url.hostname);
  const rule = ruleFor(state.rules, url.hostname);
  if (rule && rule.mode === "block") return { kind: "blocked", host: url.hostname, domain: rule.domain };
  if (aiSiteFor(state.tabUrl)) return { kind: "builtin", host: url.hostname, domain };
  if (rule && rule.mode === "allow") return { kind: "allowed", host: url.hostname, domain: rule.domain };
  return { kind: "inactive", host: url.hostname, domain };
}

async function tabMessage(message) {
  return chrome.tabs.sendMessage(state.tab.id, message).catch(() => null);
}

async function injectWidget() {
  try {
    await chrome.scripting.executeScript({ target: { tabId: state.tab.id }, files: ["content/widget.js"] });
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------------------------------------ actions

async function connect() {
  await send({ type: "startConnect" });
  window.close();
}

async function disconnect() {
  state.menuOpen = false;
  applyState(await send({ type: "disconnect" }));
  await refresh();
}

async function openOnWeb(path) {
  await chrome.tabs.create({ url: `${await getApiBase()}${path}` });
  window.close();
}

async function refresh() {
  applyState(await send({ type: "refreshAccount" }));
  render();
}

async function useOnPage(tool) {
  const info = siteInfo();
  if (info.kind === "unsupported") return setStatus("tool", "error", info.reason);
  if (info.kind === "blocked") return setStatus("tool", "error", `Cuelara is turned off on ${info.domain}. Turn it back on below.`);
  setStatus("tool", "busy", "Working on your prompt…");
  let pong = await tabMessage({ type: "cuelara:ping" });
  if (!pong) {
    if (!(await injectWidget())) return setStatus("tool", "error", "Cuelara can't run on this page.");
    pong = await tabMessage({ type: "cuelara:ping" });
  }
  if (!pong) return setStatus("tool", "error", "Cuelara can't run on this page.");
  const res = await tabMessage({ type: "cuelara:run", tool: tool.id });
  if (!res) return setStatus("tool", "error", "The page didn't respond. Reload it and try again.");
  if (res.picking) return setStatus("tool", "ok", "Now click the text box on the page and type your prompt. The Cuelara button will appear next to it.");
  if (!res.ok) return setStatus("tool", "error", res.error || "Something went wrong.");
  setStatus("tool", "ok", res.note ? `Done — your prompt was replaced. ${res.note}.` : "Done — your prompt was replaced.");
  refresh();
}

// Lets the user point at the text box when automatic detection can't find it (or the popup took focus off it).
async function pickField(area) {
  const info = siteInfo();
  if (info.kind === "unsupported") return setStatus(area, "error", info.reason);
  if (info.kind === "blocked") return setStatus(area, "error", `Cuelara is turned off on ${info.domain}. Turn it back on first.`);
  let pong = await tabMessage({ type: "cuelara:ping" });
  if (!pong) {
    if (!(await injectWidget())) return setStatus(area, "error", "Cuelara can't run on this page.");
    pong = await tabMessage({ type: "cuelara:ping" });
  }
  const res = pong ? await tabMessage({ type: "cuelara:pick" }) : null;
  if (!res || !res.ok) return setStatus(area, "error", "Cuelara can't run on this page.");
  setStatus(area, "ok", "Now click the text box you want to use on the page, then type your prompt.");
}

async function activateHere() {
  setStatus("site", "busy", "Turning Cuelara on…");
  if (await injectWidget()) setStatus("site", "ok", "Active on this page. Click a text box to see the Cuelara button.");
  else setStatus("site", "error", "Cuelara can't run on this page.");
}

async function alwaysAllow(info) {
  // permissions.request must be the first thing that happens inside the click.
  let granted = false;
  try {
    granted = await chrome.permissions.request({ origins: [matchPatternFor(info.domain)] });
  } catch {
    granted = false;
  }
  if (!granted) return setStatus("site", "error", "Permission wasn't granted, so Cuelara stays off on this site.");
  applyState(await send({ type: "saveRule", domain: info.domain, mode: "allow" }));
  await injectWidget();
  setStatus("site", "ok", `Cuelara will always run on ${info.domain} and its subdomains.`);
}

async function setRule(domain, mode) {
  applyState(await send({ type: "saveRule", domain, mode }));
  setStatus("site", "info", mode === "block" ? `Cuelara is off on ${domain} and its subdomains.` : "");
}

async function clearRule(domain) {
  applyState(await send({ type: "removeRule", domain }));
  setStatus("site", "info", "");
}

async function analyse() {
  setStatus("analyse", "busy", "Measuring the page…");
  try {
    const raw = await measureTab(state.tab.id);
    await chrome.storage.session.set({ pending: { ok: true, raw, url: state.tabUrl } });
    setStatus("analyse", "busy", "Opening Site to Prompt…");
    await openToolPage(true);
    window.close();
  } catch {
    setStatus("analyse", "error", MEASURE_ERROR);
  }
}


// ------------------------------------------------------------------------------------------------ help

async function setHelp(show) {
  state.showHelp = show;
  if (!show) await chrome.storage.local.set({ helpDismissed: true }).catch(() => {});
  render();
}

function helpCard() {
  if (!state.showHelp) return null;
  const step = (n, title, text) =>
    h("li", {}, h("span", { class: "n", text: String(n) }), h("div", {}, h("b", { text: title }), h("p", { class: "muted", text })));
  return h(
    "section",
    { class: "card help" },
    h("div", { class: "card-title" }, h("span", { class: "eyebrow", text: "Get started" }), h("button", { class: "btn secondary sm", type: "button", onclick: () => setHelp(false) }, "Got it")),
    h(
      "ol",
      {},
      step(1, "Click into a chat box", "On ChatGPT, Claude, Gemini and other AI sites, a small Cuelara button appears next to the box you’re typing in. Don’t see it? Reload the tab, or open this popup and press “Choose a text box”."),
      step(2, "Pick a tool", "Choose Optimize, Build, Compress, Format or Debug. Your prompt is replaced right in the box, and Undo is one click away."),
      step(3, "Using another website?", "Open this popup there and press “Use on this page”, or “Always allow” to have it ready next time."),
      step(4, "Want more uses?", "Connect your account for your plan’s higher limits. Nothing is sent until you pick a tool.")
    )
  );
}

// ------------------------------------------------------------------------------------------------ views

function statusLine(area) {
  const s = state.status[area];
  if (!s) return null;
  return h("p", { class: `status ${s.kind}`, role: s.kind === "error" ? "alert" : "status" }, s.kind === "busy" ? h("span", { class: "spin" }) : null, s.text);
}

function initials() {
  const user = state.account && state.account.user;
  const source = (user && (user.name || user.email)) || "?";
  const parts = source.trim().split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : source.slice(0, 2)).toUpperCase();
}

function header() {
  const user = state.account && state.account.user;
  const right = state.connected
    ? h("button", { class: "avatar", type: "button", "aria-label": "Account menu", "aria-expanded": String(state.menuOpen), onclick: () => ((state.menuOpen = !state.menuOpen), render()) }, initials())
    : h("button", { class: "btn primary sm", type: "button", onclick: connect }, icon("plug"), "Connect");
  const top = h("div", { class: "top" }, h("div", { class: "brand" }, h("img", { src: "icons/icon-48.png", alt: "", width: "28", height: "28" }), h("b", { text: "Cuelara" })), right);
  if (!state.connected || !state.menuOpen) return top;
  const menu = h(
    "div",
    { class: "menu", role: "menu" },
    h("div", { class: "who" }, h("b", { text: (user && (user.name || user.email)) || "Connected" }), user && user.name ? h("span", { class: "muted", text: user.email }) : null),
    h("button", { type: "button", role: "menuitem", onclick: () => openOnWeb("/dashboard") }, icon("dash"), "Dashboard"),
    h("button", { type: "button", role: "menuitem", onclick: disconnect }, icon("logout"), "Disconnect this browser")
  );
  return h("div", {}, top, menu);
}

function usageCard() {
  const account = state.account;
  const rows = account && Array.isArray(account.usage) ? account.usage : [];
  const plan = account && account.plan;
  const textIds = new Set(TEXT_TOOLS.map((t) => t.usageId));
  const shown = rows
    .filter((r) => textIds.has(r.id) && r.limit > 0)
    .sort((a, b) => b.used / b.limit - a.used / a.limit)
    .slice(0, 3);

  const title = h("div", { class: "card-title" }, h("span", { class: "eyebrow", text: "Today" }), h("span", { class: "badge", text: state.connected ? (plan ? plan.name : "Connected") : "Free · anonymous" }));
  const body = shown.length
    ? shown.map((r) => h("div", { class: "use-row" }, h("span", { text: r.label }), h("span", { text: `${r.used} / ${r.limit}` }), meter(r)))
    : [h("p", { class: "muted", text: "Loading your usage…" })];

  const nearLimit = shown.some((r) => r.used / r.limit >= 0.8);
  const footer = !state.connected
    ? h("p", { class: "muted small", style: "margin-top:10px" }, "Connect your account for your plan’s higher limits and synced site settings.")
    : nearLimit
      ? h("button", { class: "btn secondary sm", type: "button", style: "margin-top:10px", onclick: () => openOnWeb("/pricing") }, icon("zap"), "Get higher limits")
      : null;
  return h("section", { class: "card" }, title, ...body, footer);
}

function toolRow(tool) {
  const row = toolUsage(tool);
  const end = row && row.limit
    ? h("div", { class: "end" }, h("small", { text: `${row.used}/${row.limit}` }), meter(row))
    : h("div", { class: "end" });
  return h(
    "button",
    { class: "tool", type: "button", onclick: () => ((state.screen = "tool"), (state.toolId = tool.id), (state.status.tool = null), render()) },
    h("span", { class: "ico" }, icon(tool.icon)),
    h("span", { class: "txt" }, h("b", { text: tool.title }), h("span", { text: tool.text ? "Works inside text boxes" : "Opens on cuelara.com" })),
    end,
    h("span", { class: "chev" }, icon("chev"))
  );
}

function siteToPromptCard() {
  const reason = state.tab ? unsupportedReason(state.tabUrl) : "No page is open.";
  const url = parseWebUrl(state.tabUrl);
  const busy = state.status.analyse && state.status.analyse.kind === "busy";
  return h(
    "section",
    { class: "card site" },
    h("div", { class: "card-title", style: "margin:0" }, h("span", { class: "eyebrow", text: "Site to Prompt" }), h("button", { class: "btn secondary sm", type: "button", onclick: () => ((openToolPage(false)), window.close()) }, "Open", icon("out"))),
    h("div", { class: "site-head" }, icon("palette"), h("span", { class: "host", text: url ? url.hostname : "Not a website" })),
    reason ? h("p", { class: "muted", text: reason }) : null,
    statusLine("analyse"),
    h("button", { class: "btn primary", type: "button", disabled: !!reason || busy, onclick: analyse }, "Analyse this page")
  );
}

function siteCard() {
  const info = siteInfo();
  if (info.kind === "unsupported") return null;

  const copy = {
    builtin: ["on", `Active on ${info.host}`, "Cuelara runs here automatically."],
    allowed: ["on", `Always allowed on ${info.domain}`, "You allowed Cuelara on this site and its subdomains."],
    blocked: ["off", `Turned off on ${info.domain}`, "Cuelara never loads on this site or its subdomains."],
    inactive: ["", `Not active on ${info.host}`, "Cuelara only runs here when you ask it to."],
  }[info.kind];

  const pick = h("button", { class: "btn secondary sm", type: "button", onclick: () => pickField("site") }, "Choose a text box");
  let actions;
  if (info.kind === "inactive") {
    actions = h("div", { class: "row" }, h("button", { class: "btn secondary sm", type: "button", onclick: activateHere }, "Use on this page"), h("button", { class: "btn secondary sm", type: "button", onclick: () => alwaysAllow(info) }, "Always allow"), pick);
  } else if (info.kind === "blocked") {
    actions = h("button", { class: "btn secondary sm", type: "button", onclick: () => clearRule(info.domain) }, "Turn back on");
  } else if (info.kind === "allowed") {
    actions = h("div", { class: "row" }, pick, h("button", { class: "btn secondary sm", type: "button", onclick: () => clearRule(info.domain) }, "Stop allowing"), h("button", { class: "btn secondary sm danger", type: "button", onclick: () => setRule(info.domain, "block") }, icon("ban"), "Block"));
  } else {
    actions = h("div", { class: "row" }, pick, h("button", { class: "btn secondary sm danger", type: "button", onclick: () => setRule(info.domain, "block") }, icon("ban"), "Don’t run here"));
  }

  return h(
    "section",
    { class: "card site" },
    h("div", { class: "site-head" }, h("span", { class: `dot ${copy[0]}` }), h("div", {}, h("div", { class: "host", text: copy[1] }), h("div", { class: "muted small", text: copy[2] }))),
    statusLine("site"),
    actions
  );
}

function homeView() {
  return h(
    "div",
    { class: "screen" },
    header(),
    helpCard(),
    usageCard(),
    h("div", { class: "list" }, h("span", { class: "eyebrow", text: "Tools" }), CATALOG.map(toolRow)),
    siteToPromptCard(),
    siteCard(),
    footerView()
  );
}

function toolView() {
  const tool = CATALOG.find((t) => t.id === state.toolId);
  if (!tool) return homeView();
  const total = tool.usage.map(usageRow).filter(Boolean);
  const info = siteInfo();
  const busy = state.status.tool && state.status.tool.kind === "busy";
  const blockedReason = info.kind === "unsupported" ? info.reason : info.kind === "blocked" ? `Cuelara is turned off on ${info.domain}.` : null;

  const usage = total.length
    ? h("section", { class: "card" }, h("span", { class: "eyebrow", text: "Your usage today" }), ...total.map((r) =>
        h("div", { style: "margin-top:8px" }, h("div", { class: "stat" }, h("b", { text: String(Math.max(0, r.limit - r.used)) }), h("span", { class: "muted", text: `left of ${r.limit} · ${r.label}` })), meter(r))))
    : null;

  return h(
    "div",
    { class: "screen" },
    h("button", { class: "back", type: "button", onclick: () => ((state.screen = "home"), render()) }, icon("back"), "All tools"),
    h("div", { class: "hero" }, h("span", { class: "ico" }, icon(tool.icon)), h("div", {}, h("h1", { text: tool.title }), h("p", { class: "muted", text: tool.purpose }))),
    usage,
    tool.text
      ? h("section", { class: "card site" },
          h("span", { class: "eyebrow", text: "On this page" }),
          h("p", { class: "muted", text: blockedReason || "Click into a text box on the page, type your prompt, then press the button." }),
          statusLine("tool"),
          h("button", { class: "btn primary", type: "button", disabled: !!blockedReason || busy, onclick: () => useOnPage(tool) }, `Use ${tool.title} on this page`),
          h("button", { class: "btn secondary sm", type: "button", disabled: !!blockedReason || busy, onclick: () => pickField("tool") }, "Can’t find it? Choose the text box"))
      : null,
    h("button", { class: "btn secondary", type: "button", onclick: () => openOnWeb(tool.page) }, tool.text ? "Open on Cuelara" : `Open ${tool.title} on Cuelara`, icon("out")),
    footerView()
  );
}

function footerView() {
  return h(
    "footer",
    {},
    h("span", { class: "muted small", text: `Version ${chrome.runtime.getManifest().version}` }),
    h(
      "span",
      { class: "links" },
      h("a", { href: "#", onclick: (e) => (e.preventDefault(), (state.screen = "home"), setHelp(true)) }, "How to use"),
      h("a", { href: "#", onclick: (e) => (e.preventDefault(), openOnWeb("/privacy")) }, "Privacy")
    )
  );
}

function render() {
  app.replaceChildren(state.screen === "tool" ? toolView() : homeView());
}

// ------------------------------------------------------------------------------------------------ start

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  state.tab = tab || null;
  state.tabUrl = (tab && tab.url) || "";
  applyState(await send({ type: "getState" }));
  const { helpDismissed } = await chrome.storage.local.get("helpDismissed").catch(() => ({}));
  state.showHelp = !helpDismissed;
  render();
  refresh();
  // Finishing "Connect" in another tab changes storage; reflect it if the popup is still open.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes.token || changes.account || changes.rules)) send({ type: "getState" }).then((s) => (applyState(s), render()));
  });
}

init();
