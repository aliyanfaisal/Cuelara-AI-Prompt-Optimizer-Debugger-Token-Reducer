export const PROD_BASE = "https://cuelara.com";
export const CUELARA_ORIGINS = ["https://cuelara.com", "https://www.cuelara.com", "http://localhost:3000"];
// Must mirror manifest.json's bridge content script "matches" — used to find tabs that were already
// open (and so never got bridge.js) when the extension is installed or updated.
export const BRIDGE_MATCH_PATTERNS = ["https://cuelara.com/*", "https://www.cuelara.com/*", "http://localhost:3000/*"];

/**
 * Where the API lives. Production unless an unpacked dev build was pointed at the local server by setting
 * `devBase` in extension storage (only the allow-listed local origin is honoured, never an arbitrary URL).
 */
export async function getApiBase() {
  try {
    const { devBase } = await chrome.storage.local.get("devBase");
    if (devBase === "http://localhost:3000") return devBase;
  } catch {
    // Storage unavailable: fall through to production.
  }
  return PROD_BASE;
}

export function isCuelaraOrigin(origin) {
  return CUELARA_ORIGINS.includes(origin);
}
