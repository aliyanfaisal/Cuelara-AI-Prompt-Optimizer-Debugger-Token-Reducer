import "server-only";
import crypto from "crypto";

// AES-256-GCM for secrets stored in the database (provider API keys). The key is derived from the
// KEY_ENCRYPTION_SECRET environment variable, so a leaked database dump alone does not expose them.
// Stored form: "enc:v1:<iv>:<auth tag>:<ciphertext>" (base64). Anything without the prefix is treated as a
// legacy plain-text value and returned as-is, so rows can be converted gradually (scripts/encrypt-keys.ts).
const PREFIX = "enc:v1:";

function encryptionKey(): Buffer | null {
  const secret = process.env.KEY_ENCRYPTION_SECRET;
  if (!secret) return null;
  return crypto.createHash("sha256").update(secret).digest();
}

export function isEncryptedSecret(value: string): boolean {
  return value.startsWith(PREFIX);
}

/** Throws when KEY_ENCRYPTION_SECRET is missing — better a clear error than silently storing a key in plain text. */
export function encryptSecret(plain: string): string {
  const key = encryptionKey();
  if (!key) throw new Error("KEY_ENCRYPTION_SECRET is not set on the server, so keys can't be stored safely.");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${PREFIX}${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptSecret(stored: string): string {
  if (!isEncryptedSecret(stored)) return stored;
  const key = encryptionKey();
  if (!key) throw new Error("KEY_ENCRYPTION_SECRET is not set, cannot decrypt stored keys.");
  const [iv, tag, ciphertext] = stored.slice(PREFIX.length).split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
}

/** Decrypts one stored key, or null (logged) if it can't be — one unreadable row must not break the whole pool. */
export function tryDecryptSecret(stored: string): string | null {
  try {
    return decryptSecret(stored);
  } catch (error) {
    console.error("Could not decrypt a stored API key (wrong or missing KEY_ENCRYPTION_SECRET?):", (error as Error).message);
    return null;
  }
}

export function maskSecret(plain: string): string {
  return plain.length <= 4 ? "••••" : `••••••••${plain.slice(-4)}`;
}
