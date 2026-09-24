import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { siteUrl } from "@/lib/blog";

// Tells Google a URL was added, changed or removed, using the Indexing API with a service account.
// Configure with GOOGLE_INDEXING_CREDENTIALS (path to the service account's JSON key file), or with
// GOOGLE_INDEXING_CLIENT_EMAIL + GOOGLE_INDEXING_PRIVATE_KEY (see .env.example). The service account's
// email must be added as an *Owner* of the property in Search Console.
// Without credentials every call is a silent no-op, so local development and tests need nothing.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const PUBLISH_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish";
const SCOPE = "https://www.googleapis.com/auth/indexing";
const TIMEOUT_MS = 8000;

export type IndexingType = "URL_UPDATED" | "URL_DELETED";

export interface IndexingResult {
  url: string;
  ok: boolean;
  status?: number;
  error?: string;
}

let fileCache: { path: string; creds: { email: string; key: string } | null } | null = null;

/** Reads client_email and private_key from the JSON key file Google Cloud gives you. Failures are logged once per path. */
function credentialsFromFile(path: string): { email: string; key: string } | null {
  if (fileCache?.path === path) return fileCache.creds;

  let creds: { email: string; key: string } | null = null;
  try {
    const json = JSON.parse(readFileSync(path, "utf8")) as { client_email?: string; private_key?: string };
    if (json.client_email && json.private_key) creds = { email: json.client_email, key: json.private_key };
    else console.error(`Google indexing: ${path} has no client_email / private_key.`);
  } catch (error) {
    console.error(`Google indexing: could not read credentials file ${path}:`, error instanceof Error ? error.message : error);
  }
  fileCache = { path, creds };
  return creds;
}

function credentials(): { email: string; key: string } | null {
  const file = process.env.GOOGLE_INDEXING_CREDENTIALS?.trim();
  if (file) return credentialsFromFile(file);

  const email = process.env.GOOGLE_INDEXING_CLIENT_EMAIL?.trim();
  // Env files usually hold the key on one line with literal "\n" sequences, sometimes wrapped in quotes.
  const key = process.env.GOOGLE_INDEXING_PRIVATE_KEY?.trim().replace(/^"|"$/g, "").replace(/\\n/g, "\n");
  return email && key ? { email, key } : null;
}

export function isIndexingConfigured(): boolean {
  return credentials() !== null;
}

const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

function signedJwt(email: string, key: string, now = Math.floor(Date.now() / 1000)): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(key);
  return `${header}.${claims}.${b64url(signature)}`;
}

let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(email: string, key: string): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: signedJwt(email, key) }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !json.access_token) throw new Error(json.error_description ?? `Token request failed (${res.status})`);

  cached = { token: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return cached.token;
}

/** Local and preview URLs would only burn the daily quota (default 200 requests) for pages Google can't reach. */
function isPublicUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname !== "localhost" && hostname !== "127.0.0.1" && !hostname.endsWith(".local");
  } catch {
    return false;
  }
}

/**
 * Submits URLs to Google. Never throws: indexing is a best-effort side effect and must not fail the
 * publish that triggered it. Failures are logged and reported in the returned results.
 */
export async function notifyGoogle(urls: string | string[], type: IndexingType = "URL_UPDATED"): Promise<IndexingResult[]> {
  const creds = credentials();
  if (!creds) return [];

  const targets = [...new Set(Array.isArray(urls) ? urls : [urls])].filter(isPublicUrl);
  if (targets.length === 0) return [];

  const results: IndexingResult[] = [];
  try {
    const token = await accessToken(creds.email, creds.key);
    for (const url of targets) {
      try {
        const res = await fetch(PUBLISH_URL, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ url, type }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (res.ok) {
          results.push({ url, ok: true, status: res.status });
        } else {
          const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
          results.push({ url, ok: false, status: res.status, error: body.error?.message ?? res.statusText });
        }
      } catch (error) {
        results.push({ url, ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push(...targets.map((url) => ({ url, ok: false, error: message })));
  }

  for (const r of results.filter((r) => !r.ok)) console.error(`Google indexing failed for ${r.url}:`, r.status ?? "", r.error);
  return results;
}

export const promptUrl = (slug: string) => `${siteUrl()}/prompt/${slug}`;
export const blogPostUrl = (slug: string) => `${siteUrl()}/blog/${slug}`;
