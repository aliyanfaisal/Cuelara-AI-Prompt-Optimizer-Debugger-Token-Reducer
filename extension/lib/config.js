export const PROD_BASE = "https://cuelara.com";

// dev-only:start
// Local development against `npm run dev`. `npm run build:extension` removes this block (and the matching manifest
// entries) from the packaged zip, so the store and manual-install builds never mention localhost.
const DEV_ORIGINS = ["http://localhost:3000"];
// dev-only:end

export const CUELARA_ORIGINS = ["https://cuelara.com", "https://www.cuelara.com", ...DEV_ORIGINS];
// Must mirror manifest.json's bridge content script "matches" — used to find tabs that were already
// open (and so never got bridge.js) when the extension is installed or updated.
export const BRIDGE_MATCH_PATTERNS = CUELARA_ORIGINS.map((origin) => `${origin}/*`);

/**
 * Where the API lives. Production unless an unpacked dev build was pointed at the local server by setting
 * `devBase` in extension storage (only the allow-listed dev origins are honoured, never an arbitrary URL — and the
 * packaged build has none).
 */
export async function getApiBase() {
  try {
    const { devBase } = await chrome.storage.local.get("devBase");
    if (DEV_ORIGINS.includes(devBase)) return devBase;
  } catch {
    // Storage unavailable: fall through to production.
  }
  return PROD_BASE;
}

export function isCuelaraOrigin(origin) {
  return CUELARA_ORIGINS.includes(origin);
}
