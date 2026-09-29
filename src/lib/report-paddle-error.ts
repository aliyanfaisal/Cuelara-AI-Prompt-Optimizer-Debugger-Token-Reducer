"use client";

import type { PaddleEventData } from "@paddle/paddle-js";

const ERROR_EVENTS = new Set(["checkout.error", "checkout.failed", "checkout.payment.failed", "checkout.payment.error"]);

/**
 * Paddle.js checkout failures (bad price id, unapproved domain, declined card, ...) only ever show as
 * Paddle's own generic "Something went wrong" overlay — nothing reaches our server on its own. This
 * forwards the event's actual detail to the existing /api/client-error pipeline, so it shows up with a
 * real message in /admin/errors instead of vanishing.
 */
export function reportPaddleEvent(event: PaddleEventData, context: string) {
  if (!event.name || !ERROR_EVENTS.has(event.name)) return;

  const detail = event as unknown as { type?: string; code?: string; detail?: string; documentation_url?: string };
  const parts = [event.name, context, detail.code, detail.type, detail.detail].filter(Boolean);
  const message = parts.join(" | ").slice(0, 500);

  console.error("Paddle checkout error:", event);

  fetch("/api/client-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, stack: detail.documentation_url, path: window.location.pathname }),
    keepalive: true,
  }).catch(() => {});
}
