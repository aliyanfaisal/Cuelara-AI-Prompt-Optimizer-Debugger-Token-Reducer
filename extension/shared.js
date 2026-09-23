import { collectPageSamples, preparePage } from "./collector.js";

export const TOOL_URL = "https://cuelara.com/tools/site-to-prompt";
export const TOOL_MATCH_PATTERNS = [
  "https://cuelara.com/tools/site-to-prompt*",
  "https://www.cuelara.com/tools/site-to-prompt*",
  "http://localhost:3000/tools/site-to-prompt*",
];
export const CUELARA_ORIGINS = ["https://cuelara.com", "https://www.cuelara.com", "http://localhost:3000"];
export const MEASURE_ERROR = "Couldn't read that page. It may be down, restricted by the browser, or still loading.";

// Pages Chrome never lets extensions script, even with host access.
const BLOCKED_HOSTS = ["chrome.google.com", "chromewebstore.google.com", "microsoftedge.microsoft.com"];

export function parseWebUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** Why a tab can't be analysed, or null if it can. Used to explain things in the popup instead of failing silently. */
export function unsupportedReason(tabUrl) {
  const url = tabUrl ? parseWebUrl(tabUrl) : null;
  if (!url) return "Chrome doesn't allow extensions to read this kind of page. Open a regular website and try again.";
  if (CUELARA_ORIGINS.includes(url.origin)) return "You're already on Cuelara. Open another website to analyse its design.";
  if (BLOCKED_HOSTS.includes(url.hostname)) return "Browser stores can't be read by extensions. Open another website.";
  return null;
}

export async function measureTab(tabId) {
  // Scroll through first so reveal-on-scroll sections exist; a failure here must never block measuring.
  await chrome.scripting.executeScript({ target: { tabId }, func: preparePage }).catch(() => {});
  const [injection] = await chrome.scripting.executeScript({ target: { tabId }, func: collectPageSamples });
  if (!injection || !injection.result) throw new Error("no result");
  return injection.result;
}

export async function openToolPage(withResult) {
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
