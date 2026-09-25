import "server-only";
import crypto from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export interface AbuseRule {
  /** Namespace, e.g. "login-ip". */
  scope: string;
  /** Who is limited: an IP, an email... (hashed before it is stored). */
  subject: string;
  limit: number;
  windowSeconds: number;
}

function bucketKey(rule: AbuseRule, now: number): { key: string; expiresAt: Date } {
  const windowMs = rule.windowSeconds * 1000;
  const start = Math.floor(now / windowMs) * windowMs;
  const subject = crypto.createHash("sha256").update(rule.subject.trim().toLowerCase()).digest("hex").slice(0, 32);
  return { key: `${rule.scope}:${subject}:${start}`, expiresAt: new Date(start + windowMs) };
}

// Every function here fails OPEN: if the counter table is unreachable (or not migrated yet), a visitor is let through
// rather than locked out — an outage in abuse protection must never take login or registration down with it.

/** Counts one attempt against the rule and reports whether it is still within the limit. */
export async function hitAbuseLimit(rule: AbuseRule): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = Date.now();
  const { key, expiresAt } = bucketKey(rule, now);
  let row;
  try {
    row = await prisma.rateLimitBucket.upsert({
      where: { key },
      create: { key, count: 1, expiresAt },
      update: { count: { increment: 1 } },
    });
  } catch (error) {
    console.error("Abuse limiter unavailable, allowing request:", error);
    return { allowed: true, retryAfterSeconds: 0 };
  }
  // Housekeeping: a small share of calls sweeps expired buckets, so the table never grows unbounded.
  if (Math.random() < 0.02) await prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }).catch(() => {});
  return { allowed: row.count <= rule.limit, retryAfterSeconds: Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)) };
}

/** Read-only: is this subject already over the limit? (Used for "count failures only" rules such as login.) */
export async function isAbuseLimited(rule: AbuseRule): Promise<{ limited: boolean; retryAfterSeconds: number }> {
  const now = Date.now();
  const { key, expiresAt } = bucketKey(rule, now);
  let row;
  try {
    row = await prisma.rateLimitBucket.findUnique({ where: { key } });
  } catch (error) {
    console.error("Abuse limiter unavailable, allowing request:", error);
  }
  return { limited: (row?.count ?? 0) >= rule.limit, retryAfterSeconds: Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)) };
}

/** Forget a subject's counter, e.g. after a successful login. */
export async function clearAbuseLimit(rule: AbuseRule): Promise<void> {
  const { key } = bucketKey(rule, Date.now());
  await prisma.rateLimitBucket.deleteMany({ where: { key } }).catch(() => {});
}

export function ipFromHeaders(get: (name: string) => string | null | undefined): string {
  const forwarded = get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return get("x-real-ip") || "unknown";
}

/** The caller's IP inside a server action / server component. */
export async function getActionIp(): Promise<string> {
  const h = await headers();
  return ipFromHeaders((name) => h.get(name));
}

export function formatWait(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? "a minute" : `${minutes} minutes`;
}
