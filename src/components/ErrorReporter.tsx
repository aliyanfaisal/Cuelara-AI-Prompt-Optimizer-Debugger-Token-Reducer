"use client";

import { useEffect } from "react";

export function reportClientError(error: unknown) {
  const err = error instanceof Error ? error : new Error(typeof error === "string" ? error : "Unknown client error");
  try {
    navigator.sendBeacon?.("/api/client-error", new Blob([JSON.stringify({ message: err.message, stack: err.stack, path: window.location.pathname })], { type: "application/json" }));
  } catch {
    // Reporting is best-effort.
  }
}

/** Forwards uncaught browser errors and unhandled promise rejections to /api/client-error. */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      // Cross-origin script noise (extensions, ad blockers) arrives as an opaque "Script error." with no detail.
      if (event.message && event.message !== "Script error.") reportClientError(event.error ?? event.message);
    };
    const onRejection = (event: PromiseRejectionEvent) => reportClientError(event.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
