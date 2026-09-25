"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise: Promise<TurnstileApi> | null = null;
function loadScript(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile did not initialise")));
    script.onerror = () => {
      scriptPromise = null; // allow a later retry
      reject(new Error("Could not load Turnstile"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

let siteKeyPromise: Promise<string | null> | null = null;
function loadSiteKey(): Promise<string | null> {
  siteKeyPromise ??= fetch("/api/turnstile")
    .then((r) => (r.ok ? r.json() : { siteKey: null }))
    .then((d) => (typeof d.siteKey === "string" && d.siteKey ? d.siteKey : null))
    .catch(() => null);
  return siteKeyPromise;
}

function Widget({ siteKey, onToken, onFailed }: { siteKey: string; onToken: (token: string) => void; onFailed: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let widgetId: string | null = null;
    let cancelled = false;
    loadScript()
      .then((api) => {
        if (cancelled || !ref.current) return;
        widgetId = api.render(ref.current, {
          sitekey: siteKey,
          theme: "auto",
          callback: (token: string) => onToken(token),
          "expired-callback": () => onToken(""),
          "error-callback": () => onToken(""),
        });
      })
      .catch(onFailed);
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey, onToken, onFailed]);

  return <div ref={ref} className="flex min-h-[65px] justify-center" />;
}

/**
 * Adds a Turnstile check to a form. Render `widget` inside the form, send `token` with the submission, call `reset()`
 * after every submission (a token works once), and keep the submit button disabled while `blocked`.
 * Where Turnstile isn't configured, `widget` is null and nothing is ever blocked.
 */
export function useTurnstile() {
  const [siteKey, setSiteKey] = useState<string | null | undefined>(undefined); // undefined = still asking the server
  const [token, setToken] = useState("");
  const [nonce, setNonce] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    loadSiteKey().then((key) => active && setSiteKey(key));
    return () => {
      active = false;
    };
  }, []);

  const reset = useCallback(() => {
    setToken("");
    setNonce((n) => n + 1);
  }, []);
  const onFailed = useCallback(() => setFailed(true), []);

  const widget = siteKey ? (
    <>
      <Widget key={nonce} siteKey={siteKey} onToken={setToken} onFailed={onFailed} />
      {failed && (
        <p role="alert" className="text-center text-xs text-rose-600 dark:text-rose-400">
          The security check couldn&rsquo;t load. Turn off any content blocker for this site and reload the page.
        </p>
      )}
    </>
  ) : null;
  const blocked = siteKey === undefined || (!!siteKey && !token);
  return { widget, token, reset, blocked };
}
