import { collectPageSamples, listCrossOriginSheets, preparePage } from "./collector.js";

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

const CSS_FETCH_TIMEOUT_MS = 8000;
const CSS_MAX_CHARS = 2_000_000;
const DARK_SELECTOR = /(\.dark\b|\[data-(?:bs-)?theme=["']?dark|\[data-mode=["']?dark|\.theme-dark|\.dark-mode|\.is-dark)[^{}]*\{/gi;
const LIGHT_SELECTOR = /(\.light\b|\[data-(?:bs-)?theme=["']?light|\[data-mode=["']?light|\.theme-light|\.light-mode)[^{}]*\{/gi;

/**
 * Stylesheets served from another origin (CDNs, asset hosts) are unreadable from inside the page, so their
 * media queries, custom properties and dark-mode selectors would be invisible. The extension has host access
 * and can fetch them; only a small set of facts is kept, and the CSS text itself is never sent anywhere.
 */
export async function summarizeCrossOriginCss(tabId) {
  const summary = { names: [], mediaTexts: [], darkSelectors: 0, lightSelectors: 0, fontFaces: 0 };
  try {
    const [injection] = await chrome.scripting.executeScript({ target: { tabId }, world: "MAIN", func: listCrossOriginSheets });
    const hrefs = (injection && injection.result) || [];
    const names = new Set();
    const media = new Set();
    await Promise.all(
      hrefs.map(async (href) => {
        try {
          if (!parseWebUrl(href)) return;
          const res = await fetch(href, { credentials: "omit", signal: AbortSignal.timeout(CSS_FETCH_TIMEOUT_MS) });
          if (!res.ok) return;
          const css = (await res.text()).slice(0, CSS_MAX_CHARS);
          for (const m of css.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)) if (!m[1].startsWith("--tw-") && names.size < 500) names.add(m[1]);
          for (const m of css.matchAll(/@media\s*([^{]+)\{/g)) if (media.size < 200) media.add(m[1].trim());
          summary.darkSelectors += (css.match(DARK_SELECTOR) || []).length;
          summary.lightSelectors += (css.match(LIGHT_SELECTOR) || []).length;
          summary.fontFaces += (css.match(/@font-face/gi) || []).length;
        } catch {
          // One unreachable stylesheet must not stop the analysis.
        }
      })
    );
    summary.names = [...names];
    summary.mediaTexts = [...media];
  } catch {
    // Reading extra CSS is a bonus; the measurements below still work without it.
  }
  return summary;
}

export async function measureTab(tabId) {
  // Scroll through first so reveal-on-scroll sections exist; a failure here must never block measuring.
  await chrome.scripting.executeScript({ target: { tabId }, world: "MAIN", func: preparePage }).catch(() => {});
  const extra = await summarizeCrossOriginCss(tabId);
  // MAIN world: framework detection reads the page's own globals (e.g. __NEXT_DATA__, jQuery).
  const [injection] = await chrome.scripting.executeScript({ target: { tabId }, world: "MAIN", func: collectPageSamples, args: [extra] });
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
