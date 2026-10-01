// Runs on Cuelara's pages. Lets the site talk to the extension through window.postMessage, and only
// relays two message types, so the page never gets direct access to any extension API.
const VERSION = chrome.runtime.getManifest().version;

window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const msg = event.data;
  if (!msg || msg.source !== "cuelara-page" || typeof msg.id !== "string") return;

  const reply = (payload) => window.postMessage({ source: "cuelara-ext", id: msg.id, ...payload }, window.location.origin);

  if (msg.type === "ping") {
    reply({ type: "pong", version: VERSION });
  } else if (msg.type === "takePending") {
    chrome.runtime
      .sendMessage({ type: "takePending" })
      .then((res) => reply({ type: "pending", pending: res ? res.pending : null }))
      .catch(() => reply({ type: "pending", pending: null }));
  } else if (msg.type === "connect" && typeof msg.state === "string" && typeof msg.token === "string") {
    // The account-connect page hands over the freshly minted token; the service worker checks the one-time state.
    chrome.runtime
      .sendMessage({ type: "connect", state: msg.state, token: msg.token })
      .then((res) => reply({ type: "connected", ok: !!(res && res.ok) }))
      .catch(() => reply({ type: "connected", ok: false }));
  } else if (msg.type === "analyse" && typeof msg.url === "string") {
    chrome.runtime
      .sendMessage({ type: "analyse", url: msg.url })
      .then((res) => reply({ type: "result", ...res }))
      .catch(() => reply({ type: "result", ok: false, error: "The extension isn't responding. Reload the page and try again." }));
  }
});
