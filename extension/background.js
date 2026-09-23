import { CUELARA_ORIGINS, MEASURE_ERROR, measureTab, parseWebUrl } from "./shared.js";

const LOAD_TIMEOUT_MS = 20000;
const SETTLE_MS = 1500;

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

// The tool page asks for a URL to be analysed: open it in an inactive tab of the user's own browser
// (their cookies apply, so logged-in pages work too), measure it, and close the tab.
async function analyse(rawUrl) {
  const url = parseWebUrl(rawUrl);
  if (!url) return { ok: false, error: "That doesn't look like a valid http(s) URL." };
  if (busy) return { ok: false, error: "Another analysis is already running. Try again in a moment." };

  busy = true;
  let tab;
  try {
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

// A page analysed from the popup is handed to the tool page once, then cleared.
async function takePending() {
  const { pending } = await chrome.storage.session.get("pending");
  if (pending) await chrome.storage.session.remove("pending");
  return pending || null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only the bridge running on Cuelara's own pages may ask for these.
  const origin = sender.tab && sender.tab.url ? new URL(sender.tab.url).origin : "";
  if (!CUELARA_ORIGINS.includes(origin)) return false;

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
