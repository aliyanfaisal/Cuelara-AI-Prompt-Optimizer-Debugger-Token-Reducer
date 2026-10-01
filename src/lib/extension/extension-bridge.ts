/** Client-side helpers for the account-connect handshake with the Cuelara browser extension (extension/bridge.js). */

const PING_TIMEOUT_MS = 800;
const CONNECT_TIMEOUT_MS = 5000;

function request<T>(payload: Record<string, unknown>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const id = Math.random().toString(36).slice(2);
    const finish = (value: T) => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
      resolve(value);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const msg = event.data;
      if (msg && msg.source === "cuelara-ext" && msg.id === id) finish(msg as T);
    };
    const timer = setTimeout(() => finish(fallback), timeoutMs);
    window.addEventListener("message", onMessage);
    window.postMessage({ source: "cuelara-page", id, ...payload }, window.location.origin);
  });
}

/** The extension's version if it's installed and answering, otherwise null. */
export async function pingExtension(): Promise<string | null> {
  const res = await request<{ type?: string; version?: string } | null>({ type: "ping" }, PING_TIMEOUT_MS, null);
  return res && res.type === "pong" && typeof res.version === "string" ? res.version : null;
}

/** Hands a freshly minted token to the extension. True only if the extension recognised the one-time `state` and stored it. */
export async function sendConnectToken(state: string, token: string): Promise<boolean> {
  const res = await request<{ type?: string; ok?: boolean } | null>({ type: "connect", state, token }, CONNECT_TIMEOUT_MS, null);
  return !!res && res.type === "connected" && res.ok === true;
}
