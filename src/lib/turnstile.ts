import "server-only";

// Cloudflare Turnstile: a privacy-friendly CAPTCHA replacement. The browser widget produces a one-time token; the
// server confirms it with Cloudflare before doing anything the bot wanted (sign-in, sign-up, sending an email...).
//
// Configured by two environment variables (read at request time, so no rebuild is needed to change them):
//   TURNSTILE_SITE_KEY    public — handed to the browser widget
//   TURNSTILE_SECRET_KEY  private — used only here
// With no secret set, checks are skipped, so local development and a not-yet-configured deploy keep working.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 5_000;

export const TURNSTILE_ERROR = "Please complete the security check and try again.";

/** The site key to give the browser — only when the secret is also set, so a widget is never shown without verification behind it. */
export function turnstileSiteKey(): string | null {
  if (!process.env.TURNSTILE_SECRET_KEY) return null;
  return process.env.TURNSTILE_SITE_KEY || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;
}

/**
 * True when the visitor passed the check (or checking is not configured). A missing or rejected token fails. If
 * Cloudflare itself can't be reached, the request is let through and the outage is logged: an outage at a third
 * party must not lock every real user out of signing in.
 */
export async function verifyTurnstile(token: unknown, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || !token || token.length > 4096) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS) });
    if (!res.ok) {
      console.error(`Turnstile verification unavailable (HTTP ${res.status}); allowing the request.`);
      return true;
    }
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error("Turnstile verification unreachable; allowing the request:", (error as Error).message);
    return true;
  }
}
