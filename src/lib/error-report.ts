import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hitAbuseLimit } from "@/lib/abuse-limit";

export interface ErrorContext {
  source: "server" | "api" | "client";
  /** The route or page it happened on, e.g. "/api/tools/token-optimizer". */
  route?: string;
}

const MAX_MESSAGE = 1000;
const MAX_STACK = 4000;

// Expected, self-inflicted "errors" of the AI fallback chain (every free provider is busy) — real traffic conditions
// already visible in Analytics, and they would drown out actual bugs here.
function isExpectedNoise(error: unknown): boolean {
  const e = error as { name?: string; status?: number } | null;
  if (e?.name === "AllProvidersExhaustedError") return true;
  return e?.status === 429 || e?.status === 413;
}

// Numbers, ids and hex blobs differ per occurrence — strip them so the same failure groups into one row.
function normalise(message: string): string {
  return message.replace(/[0-9a-f]{8,}/gi, "#").replace(/\d+/g, "#");
}

function fingerprintFor(source: string, route: string | undefined, message: string, stack: string | undefined): string {
  const frame = stack?.split("\n").find((line) => line.trim().startsWith("at "))?.trim() ?? "";
  return crypto.createHash("sha256").update([source, route ?? "", normalise(message), frame.replace(/:\d+:\d+\)?$/, "")].join("|")).digest("hex").slice(0, 32);
}

/**
 * Records an application error (grouped by fingerprint) and emails the team the FIRST time a new one appears.
 * Best-effort by design: reporting must never throw or slow down the request that failed — it is safe to call
 * without awaiting. Only the message, stack and route are stored, never request bodies or prompts.
 */
export async function reportError(error: unknown, context: ErrorContext): Promise<void> {
  try {
    if (isExpectedNoise(error)) return;
    const message = (error instanceof Error ? error.message : String(error)).slice(0, MAX_MESSAGE) || "Unknown error";
    const stack = error instanceof Error ? error.stack?.slice(0, MAX_STACK) : undefined;
    const fingerprint = fingerprintFor(context.source, context.route, message, stack);

    const existing = await prisma.errorLog.findUnique({ where: { fingerprint }, select: { id: true } });
    if (existing) {
      // A fixed-then-recurring error reopens itself, so a "resolved" row can't hide a regression.
      await prisma.errorLog.update({ where: { id: existing.id }, data: { count: { increment: 1 }, lastSeenAt: new Date(), resolved: false } });
      return;
    }

    await prisma.errorLog.create({ data: { fingerprint, source: context.source, message, stack, route: context.route } });
    await sendAlert(context, message);
  } catch (reportingError) {
    // Never report a failure of the reporter itself (that could loop) — just note it.
    console.error("Error reporting failed:", reportingError);
  }
}

async function sendAlert(context: ErrorContext, message: string): Promise<void> {
  // A cap across all errors, so a bad deploy that throws a hundred different errors sends a few emails, not a hundred.
  const cap = await hitAbuseLimit({ scope: "error-alert", subject: "all", limit: 10, windowSeconds: 60 * 60 });
  if (!cap.allowed) return;

  const { sendEmail, contactRecipient } = await import("@/lib/email");
  const to = contactRecipient();
  if (!to) return;
  const where = context.route ? ` on ${context.route}` : "";
  const base = process.env.NEXTAUTH_URL || "";
  const escaped = message.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  await sendEmail({
    type: "error-alert",
    to,
    subject: `[Cuelara] New ${context.source} error${where}`,
    text: `A new error was recorded${where}:\n\n${message}\n\nDetails: ${base}/admin/errors`,
    html: `<p>A new error was recorded${where}:</p><pre style="white-space:pre-wrap">${escaped}</pre><p><a href="${base}/admin/errors">Open the error log</a></p>`,
  }).catch(() => {});
}
