import { createHash, timingSafeEqual } from "node:crypto";

// Hashing both sides first gives equal-length buffers for timingSafeEqual, so neither the
// token's content nor its length leaks through timing.
export function isAuthorizedBearer(header: string | null, expectedToken: string | undefined): boolean {
  if (!expectedToken) return false;
  const match = header?.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const provided = createHash("sha256").update(match[1].trim()).digest();
  const expected = createHash("sha256").update(expectedToken).digest();
  return timingSafeEqual(provided, expected);
}
