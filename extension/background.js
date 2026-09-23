import { collectPageSamples } from "./collector.js";

const TOOL_URL = "https://cuelara.com/tools/site-to-prompt";
const LOAD_TIMEOUT_MS = 20000;
const SETTLE_MS = 1500;
const ALLOWED_SENDER_ORIGINS = ["https://cuelara.com", "https://www.cuelara.com", "http://localhost:3000"];

const TOOL_MATCH_PATTERNS = [
  "https://cuelara.com/tools/site-to-prompt*",
  "https://www.cuelara.com/tools/site-to-prompt*",
  "http://localhost:3000/tools/site-to-prompt*",
];

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

function parseWebUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

const MEASURE_ERROR = "Couldn't read that page. It may be down, restricted by the browser, or still loading.";

async function measureTab(tabId) {
  const [injection] = await chrome.scripting.executeScript({ target: { tabId }, func: collectPageSamples });
  if (!injection || !injection.result) throw new Error("no result");
  return injection.result;
}

async function analyse(rawUrl) {
  const url = parseWebUrl(rawUrl);
  if (!url) return { ok: false, error: "That doesn't look like a valid http(s) URL." };
  if (busy) return { ok: false, error: "Another analysis is already running. Try again in a moment." };

  busy = true;
  let tab;
  try {
    // An inactive tab in the user's own browser: their cookies apply, so logged-in pages work too.
    tab = await chrome.tabs.create({ url: url.toString(), active: false });
    await waitForLoad(tab.id);
    await new Promise((r) => setTimeout(r, SETTLE_MS));
    return { ok: true, raw: await measureTab(tab.id) };
  } catch {
    return { ok: false, error: MEASURE_ERROR };
  } finally {
    busy = false;
    if (tab && tab.id !== undefined) chrome.tabs.remove(tab.id).catch(() => {});
  }
}

async function openToolPage(withResult) {
  const url = withResult ? `${TOOL_URL}?from=extension` : TOOL_URL;
  // Reuse an already-open tool tab instead of piling up new ones.
  const existing = await chrome.tabs.query({ url: TOOL_MATCH_PATTERNS });
  if (existing.length > 0 && existing[0].id !== undefined) {
    await chrome.tabs.update(existing[0].id, { url, active: true });
    if (existing[0].windowId !== undefined) chrome.windows.update(existing[0].windowId, { focused: true }).catch(() => {});
  } else {
    await chrome.tabs.create({ url });
  }
}

// Toolbar click on any website: measure that tab in place, stash the result, and open the tool page to show it.
chrome.action.onClicked.addListener(async (tab) => {
  const pageUrl = tab.url ? parseWebUrl(tab.url) : null;
  const onCuelara = pageUrl && ALLOWED_SENDER_ORIGINS.includes(pageUrl.origin);
  if (!pageUrl || onCuelara || tab.id === undefined) return openToolPage(false);

  try {
    const raw = await measureTab(tab.id);
    await chrome.storage.session.set({ pending: { ok: true, raw, url: pageUrl.toString() } });
  } catch {
    await chrome.storage.session.set({ pending: { ok: false, error: MEASURE_ERROR } });
  }
  return openToolPage(true);
});

async function takePending() {
  const { pending } = await chrome.storage.session.get("pending");
  if (pending) await chrome.storage.session.remove("pending");
  return pending || null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only the bridge running on Cuelara's own pages may ask for an analysis.
  const origin = sender.tab && sender.tab.url ? new URL(sender.tab.url).origin : "";
  if (!ALLOWED_SENDER_ORIGINS.includes(origin)) return false;

  if (message && message.type === "analyse" && typeof message.url === "string") {
    analyse(message.url).then(sendResponse);
    return true; // keep the channel open for the async response
  }
  if (message && message.type === "takePending") {
    takePending().then((pending) => sendResponse({ pending }));
    return true;
  }
  return false;
});
