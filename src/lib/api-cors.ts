/** Permissive CORS for the public REST API (src/app/api/v1/*) — these endpoints are meant to be
 * called from a third party's own server or client-side app, not just same-origin. */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function corsJson(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value);
  return Response.json(body, { ...init, headers });
}

export function handleCorsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
