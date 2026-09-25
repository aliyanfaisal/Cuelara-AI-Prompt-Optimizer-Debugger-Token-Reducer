import { NextResponse } from "next/server";
import { hitAbuseLimit, ipFromHeaders } from "@/lib/abuse-limit";
import { reportError } from "@/lib/error-report";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 8 * 1024;

/** Receives errors thrown in visitors' browsers (see ErrorReporter). Public, so tightly bounded and rate limited. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return new NextResponse(null, { status: 204 });

  const limit = await hitAbuseLimit({ scope: "client-error", subject: ipFromHeaders((n) => req.headers.get(n)), limit: 20, windowSeconds: 10 * 60 });
  if (!limit.allowed) return new NextResponse(null, { status: 204 });

  try {
    const { message, stack, path } = JSON.parse(raw) as { message?: unknown; stack?: unknown; path?: unknown };
    if (typeof message !== "string" || !message) return new NextResponse(null, { status: 204 });
    const error = new Error(message.slice(0, 500));
    error.stack = typeof stack === "string" ? stack.slice(0, 3000) : undefined;
    await reportError(error, { source: "client", route: typeof path === "string" ? path.slice(0, 200) : undefined });
  } catch {
    // Malformed report — nothing useful to do, and the browser doesn't care.
  }
  return new NextResponse(null, { status: 204 });
}
