import { MEASURE_ERROR, measureTab, parseWebUrl } from "./shared.js";
import { BRIDGE_MATCH_PATTERNS, getApiBase, isCuelaraOrigin } from "./lib/config.js";
import { ApiError, disconnectAccount, getMe, runTool } from "./lib/api.js";
import { removeRule, saveRule, syncRules } from "./lib/rules.js";
import { clearAccount, getAccountCache, getRules, getToken, setAccountCache, setToken } from "./lib/storage.js";

const LOAD_TIMEOUT_MS = 20000;
const SETTLE_MS = 1500;
const CONNECT_TTL_MS = 10 * 60 * 1000;
const CONSENT_TIMEOUT_MS = 2 * 60 * 1000;
const SYNC_ALARM = "cuelara-sync";
const TOKEN_PATTERN = /^cuelara_pat_[0-9a-f]{48}$/;

let busy = false;

function waitForLoad(tabId) {
  return new Promise((resolve) => {
    const done = () => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      clearTimeout(timer);
      resolve();
    };
    const onUpdated = (id, info) => {
      if (id === tabId && info.status === "complete") done();
    };
    // If the load stalls we still try to measure whatever has rendered.
    const timer = setTimeout(done, LOAD_TIMEOUT_MS);
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.get(tabId).then((t) => t.status === "complete" && done()).catch(done);
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Site to Prompt, started from the website: open the URL in an inactive tab, measure it, close the tab.
// Reading a site the extension has no access to needs the user's explicit OK first (see askSiteAccess).
// ---------------------------------------------------------------------------------------------------------------

const consentRequests = new Map(); // id -> { resolve, windowId }

/** Opens a small window asking the user to allow reading `url`'s site; resolves true only if they grant it. */
function askSiteAccess(url) {
  const id = crypto.randomUUID();
  return new Promise((resolve) => {
    let settled = false;
    const finish = (granted) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      chrome.windows.onRemoved.removeListener(onRemoved);
      const entry = consentRequests.get(id);
      consentRequests.delete(id);
      if (entry && entry.windowId !== undefined) chrome.windows.remove(entry.windowId).catch(() => {});
      resolve(granted);
    };
    const onRemoved = (windowId) => {
      const entry = consentRequests.get(id);
      if (entry && entry.windowId === windowId) finish(false);
    };
    const timer = setTimeout(() => finish(false), CONSENT_TIMEOUT_MS);
    consentRequests.set(id, { resolve: finish, windowId: undefined });
    chrome.windows.onRemoved.addListener(onRemoved);
    chrome.windows
      .create({ url: chrome.runtime.getURL(`confirm.html?id=${id}&url=${encodeURIComponent(url.origin)}`), type: "popup", width: 420, height: 340 })
      .then((win) => {
        const entry = consentRequests.get(id);
        if (entry) entry.windowId = win.id;
      })
      .catch(() => finish(false));
  });
}

async function analyse(rawUrl) {
  const url = parseWebUrl(rawUrl);
  if (!url) return { ok: false, error: "That doesn't look like a valid http(s) URL." };
  if (busy) return { ok: false, error: "Another analysis is already running. Try again in a moment." };

  const origins = [`${url.protocol}//${url.hostname}/*`];
  const alreadyAllowed = await chrome.permissions.contains({ origins }).catch(() => false);
  busy = true;
  let tab;
  let grantedHere = false;
  try {
    if (!alreadyAllowed) {
      grantedHere = await askSiteAccess(url);
      if (!grantedHere) return { ok: false, error: "Cuelara needs your permission to read that site's design. Allow it in the window that opens, then try again." };
    }
    tab = await chrome.tabs.create({ url: url.toString(), active: false });
    await waitForLoad(tab.id);
    await new Promise((r) => setTimeout(r, SETTLE_MS));
    return { ok: true, raw: await measureTab(tab.id) };
  } catch {
    return { ok: false, error: MEASURE_ERROR };
  } finally {
    busy = false;
    if (tab && tab.id !== undefined) chrome.tabs.remove(tab.id).catch(() => {});
    // Access given for this one analysis isn't kept afterwards.
    if (grantedHere) chrome.permissions.remove({ origins }).catch(() => {});
  }
}

// A page analysed from the popup is handed to the tool page once, then cleared.
async function takePending() {
  const { pending } = await chrome.storage.session.get("pending");
  if (pending) await chrome.storage.session.remove("pending");
  return pending || null;
}

// ---------------------------------------------------------------------------------------------------------------
// Connecting a Cuelara account: the popup opens /extension/connect with a one-time `state`; once the user approves
// there, the page hands the token back through bridge.js and it is accepted only if the state matches.
// ---------------------------------------------------------------------------------------------------------------

function randomState() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function startConnect() {
  const state = randomState();
  await chrome.storage.session.set({ connect: { state, expiresAt: Date.now() + CONNECT_TTL_MS } });
  await chrome.tabs.create({ url: `${await getApiBase()}/extension/connect?state=${state}` });
  return { ok: true };
}

async function completeConnect(state, token, tabId) {
  const { connect } = await chrome.storage.session.get("connect");
  // One attempt per state, whatever the outcome.
  await chrome.storage.session.remove("connect");
  if (!connect || connect.state !== state || Date.now() > connect.expiresAt || !TOKEN_PATTERN.test(token)) return { ok: false };

  await setToken(token);
  // Answer the page straight away: it only waits a few seconds for this reply, and loading the account and syncing the
  // site rules (two network calls) is not something it needs to wait for. The popup picks the results up from storage.
  Promise.all([refreshAccount().catch(() => {}), syncRules()]).catch(() => {});
  if (tabId !== undefined) setTimeout(() => chrome.tabs.remove(tabId).catch(() => {}), 2500);
  return { ok: true };
}

/** Refreshes the cached account (name, plan, usage) the popup and widget show. Signed-out callers get anonymous limits. */
async function refreshAccount() {
  try {
    const me = await getMe();
    await setAccountCache({ ...me, fetchedAt: Date.now() });
    return me;
  } catch (error) {
    if (error instanceof ApiError && error.code === "SIGNED_OUT") await clearAccount();
    throw error;
  }
}

async function getState() {
  return { connected: !!(await getToken()), account: await getAccountCache(), rules: await getRules() };
}

async function handleRunTool(toolId, text) {
  if (typeof toolId !== "string" || typeof text !== "string" || !text.trim()) return { ok: false, error: "There's no text to work with." };
  try {
    const result = await runTool(toolId, text);
    refreshAccount().catch(() => {}); // keeps the remaining-uses count current
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error: error.message, code: error.code, status: error.status };
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------------------------------------------

// The manifest's declared content script only runs on a NEW navigation — a Cuelara tab that was
// already open when the extension gets installed (very likely, since that's where the install
// instructions are shown) never receives bridge.js on its own, so the page's ping keeps timing out
// until the user manually reloads. Inject it into any matching tab immediately on install/update.
async function injectBridgeIntoOpenTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: BRIDGE_MATCH_PATTERNS });
    await Promise.all(
      tabs
        .filter((tab) => tab.id !== undefined)
        .map((tab) => chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["bridge.js"] }).catch(() => {}))
    );
  } catch {
    // Best-effort — the page's own reload (or its "unlocks automatically" poll after a manual
    // refresh) still works even if this injection fails for some reason.
  }
}

async function ensureSyncAlarm() {
  if (!(await chrome.alarms.get(SYNC_ALARM))) chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 24 * 60 });
}

chrome.runtime.onInstalled.addListener(() => {
  injectBridgeIntoOpenTabs();
  ensureSyncAlarm();
  syncRules();
});
chrome.runtime.onStartup.addListener(() => {
  ensureSyncAlarm();
  syncRules();
  getToken().then((token) => token && refreshAccount().catch(() => {}));
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== SYNC_ALARM) return;
  syncRules();
  getToken().then((token) => token && refreshAccount().catch(() => {}));
});

// ---------------------------------------------------------------------------------------------------------------
// Messages. Three kinds of sender, each allowed only its own requests:
//   - bridge.js on Cuelara's own pages (the website talking to the extension)
//   - the extension's own pages (popup, confirmation window)
//   - the field widget running inside a web page (can run tools and block its own site, nothing else)
// ---------------------------------------------------------------------------------------------------------------

function senderOrigin(sender) {
  try {
    return sender.url ? new URL(sender.url).origin : "";
  } catch {
    return "";
  }
}

const FROM_CUELARA_PAGE = {
  analyse: (m) => (typeof m.url === "string" ? analyse(m.url) : null),
  takePending: async () => ({ pending: await takePending() }),
  connect: (m, sender) => (typeof m.state === "string" && typeof m.token === "string" ? completeConnect(m.state, m.token, sender.tab && sender.tab.id) : null),
};

const FROM_EXTENSION_PAGE = {
  getState: () => getState(),
  refreshAccount: async () => {
    try {
      await refreshAccount();
    } catch {
      // The popup falls back to whatever is cached.
    }
    return getState();
  },
  startConnect: () => startConnect(),
  disconnect: async () => {
    await disconnectAccount();
    return getState();
  },
  saveRule: async (m) => {
    await saveRule(m.domain, m.mode === "allow" ? "allow" : "block");
    return getState();
  },
  removeRule: async (m) => {
    await removeRule(m.domain);
    return getState();
  },
  siteAccessDecision: (m) => {
    const entry = consentRequests.get(m.id);
    if (entry) entry.resolve(!!m.granted);
    return { ok: true };
  },
};

const FROM_WIDGET = {
  runTool: (m) => handleRunTool(m.tool, m.text),
  getState: () => getState(),
  // The widget may only block the site it is running on, never allow or remove rules.
  blockThisSite: async (m, sender) => {
    const host = (() => {
      try {
        return new URL(sender.url).hostname;
      } catch {
        return "";
      }
    })();
    if (!host) return { ok: false };
    await saveRule(host, "block");
    return { ok: true };
  },
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== "string" || sender.id !== chrome.runtime.id) return false;

  const origin = senderOrigin(sender);
  let table;
  if (origin === new URL(chrome.runtime.getURL("")).origin) table = FROM_EXTENSION_PAGE;
  else if (sender.tab && isCuelaraOrigin(origin) && FROM_CUELARA_PAGE[message.type]) table = FROM_CUELARA_PAGE;
  else if (sender.tab) table = FROM_WIDGET;
  else return false;

  const handler = Object.prototype.hasOwnProperty.call(table, message.type) ? table[message.type] : null;
  if (!handler) return false;
  const result = handler(message, sender);
  if (!result) return false;
  Promise.resolve(result).then(sendResponse, () => sendResponse({ ok: false, error: "Something went wrong. Please try again." }));
  return true; // keep the channel open for the async response
});
