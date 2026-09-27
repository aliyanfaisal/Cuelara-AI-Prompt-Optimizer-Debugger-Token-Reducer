import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// Never stored or logged in plaintext — only its sha256 hash. The prefix lets us reject anything
// that clearly isn't one of ours before touching the database.
const TOKEN_PREFIX = "cuelara_pat_";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateTokenValue(): string {
  return `${TOKEN_PREFIX}${crypto.randomBytes(24).toString("hex")}`;
}

export interface PersonalAccessTokenRow {
  id: string;
  label: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

/** Creates a token and returns its plaintext once — the caller must show it to the user now; it can never be recovered. */
export async function createPersonalAccessToken(userId: string, label: string): Promise<{ id: string; token: string }> {
  const token = generateTokenValue();
  const created = await prisma.personalAccessToken.create({
    data: { userId, label: label.trim().slice(0, 60) || "MCP", tokenHash: hashToken(token) },
    select: { id: true },
  });
  return { id: created.id, token };
}

export async function listPersonalAccessTokens(userId: string): Promise<PersonalAccessTokenRow[]> {
  return prisma.personalAccessToken.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, createdAt: true, lastUsedAt: true },
  });
}

/** Scoped to the caller's own tokens, so a foreign or already-revoked id revokes nothing. */
export async function revokePersonalAccessToken(id: string, userId: string): Promise<boolean> {
  const deleted = await prisma.personalAccessToken.deleteMany({ where: { id, userId } });
  return deleted.count > 0;
}

/** Resolves a bearer token to its owning user id, or null if it's malformed, unknown, or revoked. */
export async function resolveUserIdFromToken(token: string): Promise<string | null> {
  if (!token.startsWith(TOKEN_PREFIX)) return null;

  const row = await prisma.personalAccessToken.findUnique({ where: { tokenHash: hashToken(token) }, select: { id: true, userId: true } });
  if (!row) return null;

  // Best-effort — a failed lastUsedAt write must never fail the call it's tracking.
  prisma.personalAccessToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return row.userId;
}
