# Cuelara Site to Prompt — browser extension

Measures a website's computed styles in the user's own browser so the web tool at `/tools/site-to-prompt` can turn them into a prompt. Plain Manifest V3 JavaScript, no build step.

## Files
- `collector.js` — injected into the analysed page; measures only (colors, fonts, spacing, radii…). Must stay self-contained.
- `background.js` — service worker. Two entry points: (1) the tool page asks it to analyse a URL (inactive tab → collector → close tab); (2) the popup's result is handed over via `chrome.storage.session`, which the tool page collects once via `takePending`. Only accepts requests from Cuelara's own pages.
- `popup.html` / `popup.js` / `popup.css` — toolbar popup: shows the current site, measures that tab on **Analyse this page**, stores the result and opens (or reuses) the tool page. Explains unsupported pages (chrome://, web stores, Cuelara itself) instead of failing silently.
- `shared.js` — helpers used by both the popup and the service worker (measuring, opening the tool page, unsupported-page rules). `measureTab` also fetches the page's cross-origin stylesheets (the extension has host access, so CORS doesn't apply) and passes only extracted facts — custom-property names, media queries, dark-mode selector counts, font-face counts — to the collector.
- `bridge.js` — content script on Cuelara pages; relays `ping` / `analyse` / `takePending` between the page (`window.postMessage`) and the service worker.

All interpretation (palette, roles, type scale…) lives server-side in `src/lib/site-to-prompt/aggregate.ts`, so analysis tweaks never need an extension update. The measurement shape is `RawPage` in `src/lib/site-to-prompt/types.ts` and is validated by `rawPageSchema`.

## Try it locally
1. `npm run dev`, then open `chrome://extensions`, enable Developer mode, **Load unpacked** → this folder.
2. Open http://localhost:3000/tools/site-to-prompt (the bridge is allowed on localhost:3000).

## Before publishing to the Chrome Web Store
- Icons are rendered from `src/app/icon.svg` (`icons/`); swap in dedicated store artwork if wanted.
- `host_permissions` covers all http(s) sites (needed to read any page the user asks for); the store listing must justify this and the privacy policy must mention what is sent (style measurements, page title, a few headings).
- Set `NEXT_PUBLIC_EXTENSION_URL` to the listing URL.
