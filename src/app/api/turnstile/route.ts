import { NextResponse } from "next/server";
import { turnstileSiteKey } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

/** The public site key for the widget (null when Turnstile isn't configured). Served at runtime so the key can change without a rebuild. */
export async function GET() {
  return NextResponse.json({ siteKey: turnstileSiteKey() }, { headers: { "Cache-Control": "public, max-age=300" } });
}
