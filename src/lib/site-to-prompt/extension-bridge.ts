import type { RawPage } from "./types";

/** Client-side helpers for talking to the Cuelara browser extension through its page bridge (extension/bridge.js). */

export type AnalyseResult = { ok: true; raw: RawPage } | { ok: false; error: string };

const PING_TIMEOUT_MS = 800;
const ANALYSE_TIMEOUT_MS = 45_000;

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

/** Resolves the extension's version if it's installed and answering, otherwise null. */
export async function pingExtension(): Promise<string | null> {
  const res = await request<{ type?: string; version?: string } | null>({ type: "ping" }, PING_TIMEOUT_MS, null);
  return res && res.type === "pong" && typeof res.version === "string" ? res.version : null;
}

export async function analyseWithExtension(url: string): Promise<AnalyseResult> {
  const res = await request<{ ok?: boolean; raw?: RawPage; error?: string } | null>({ type: "analyse", url }, ANALYSE_TIMEOUT_MS, null);
  if (!res) return { ok: false, error: "The extension didn't respond in time. Please try again." };
  if (res.ok && res.raw) return { ok: true, raw: res.raw };
  return { ok: false, error: res.error || "Couldn't read that page." };
}

export interface PendingResult {
  ok: boolean;
  raw?: RawPage;
  url?: string;
  error?: string;
}

/** A page the user analysed by clicking the toolbar icon on another site; handed over once, then cleared. */
export async function takePendingAnalysis(): Promise<PendingResult | null> {
  const res = await request<{ pending?: PendingResult | null } | null>({ type: "takePending" }, PING_TIMEOUT_MS * 3, null);
  return res?.pending ?? null;
}
