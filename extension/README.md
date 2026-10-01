# Cuelara browser extension

Prompt tools inside AI chat boxes, plus Site to Prompt. Plain Manifest V3 JavaScript, no build step.

## What it does
- **Field widget** (`content/widget.js`): a small button on multi-line text boxes with Optimize, Build, Compress, Format and Debug. Nothing is read or sent until the user picks a tool. It writes the result back through the page's own editor (paste event, then `insertText`, then clipboard) and offers Undo.
- **Popup** (`popup.html` / `popup.js` / `popup.css`): usage and plan, all Cuelara tools (each with its own screen), a compact Site to Prompt card, per-site controls, and a dismissible "Get started" card.
- **Site to Prompt**: `collector.js` is injected into the analysed page and only measures. Interpretation lives server-side in `src/lib/site-to-prompt/aggregate.ts`, so analysis changes never need an extension update.
- **Accounts**: "Connect" opens `/extension/connect` on cuelara.com; the user approves there and the page hands a personal access token to the extension through `bridge.js` (checked against a one-time `state`). The extension works anonymously with the free limits when not connected.

## Files
- `manifest.json` — permissions are `storage`, `scripting`, `activeTab`, `alarms`. `host_permissions` lists cuelara.com plus the built-in AI sites; everything else is an optional permission requested per site.
- `background.js` — service worker: runs tools (`lib/api.js`), connects/disconnects accounts, syncs site rules, registers the widget, and runs website-initiated Site to Prompt analyses after asking via `confirm.html`.
- `bridge.js` — content script on Cuelara pages; relays `ping` / `analyse` / `takePending` / `connect` between the page (`window.postMessage`) and the service worker.
- `shared.js` — measuring helpers shared by the popup and the service worker.
- `lib/ai-sites.js` — the sites where the widget runs by itself. **Keep it in sync with `host_permissions`**; `npm run build:extension` fails if they differ.
- `lib/rules.js` — site rules (block beats allow; a rule on a domain covers its subdomains) and dynamic widget registration. Blocked domains go into `excludeMatches`, so the script is never injected there.
- `lib/tools.js`, `lib/api.js`, `lib/storage.js`, `lib/config.js`, `lib/domain.js` — tool definitions, API client, storage, config, domain matching (mirrors `src/lib/extension/domain.ts`).
- `confirm.html` / `confirm.js` / `confirm.css` — the "Read this site's design?" window.

## Try it locally
1. `npm run dev`, then open `chrome://extensions`, enable Developer mode, **Load unpacked** → this folder.
2. To point it at the local server, run `chrome.storage.local.set({ devBase: "http://localhost:3000" })` in the service worker's console.

## Releasing
1. Bump `version` in `manifest.json` (the zip's file name carries it, so browsers never reuse an old download).
2. `npm run build:extension` — zips the folder into `public/` and updates `src/lib/site-to-prompt/extension-version.ts`.
3. Commit the new zip and the version file.

## Before publishing to the Chrome Web Store
- Set `NEXT_PUBLIC_EXTENSION_URL` to the listing URL; every install prompt on the site then switches to "Add to Chrome".
- Single purpose: "AI prompt tools for the text you write on the web."
- Justify `host_permissions` in the listing: the widget needs the AI sites to place its button next to the text box and write the result back; text is sent only after the user picks a tool. Optional host permissions are requested per site, on a user click.
- Data disclosure: authentication information (access token) and website content (only the text of a box, after a tool is chosen, and style measurements when Analyse is pressed). The privacy policy section is at `/privacy` (section 13).
- No remote code, no analytics; the only network destination is cuelara.com.
