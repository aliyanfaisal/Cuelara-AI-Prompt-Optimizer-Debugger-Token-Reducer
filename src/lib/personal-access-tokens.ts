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

export type PersonalAccessTokenKind = "mcp" | "extension";

// A browser extension mints a fresh token on every connect, so a user who keeps reconnecting
// would otherwise pile up unused ones; past this many, the least recently used are revoked.
const MAX_EXTENSION_TOKENS = 10;

export interface PersonalAccessTokenRow {
  id: string;
  label: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

/** Creates a token and returns its plaintext once — the caller must show it to the user now; it can never be recovered. */
export async function createPersonalAccessToken(
  userId: string,
  label: string,
  kind: PersonalAccessTokenKind = "mcp"
): Promise<{ id: string; token: string }> {
  const token = generateTokenValue();
  const created = await prisma.personalAccessToken.create({
    data: { userId, kind, label: label.trim().slice(0, 60) || (kind === "extension" ? "Browser extension" : "MCP"), tokenHash: hashToken(token) },
    select: { id: true },
  });
  if (kind === "extension") await pruneExtensionTokens(userId);
  return { id: created.id, token };
}

async function pruneExtensionTokens(userId: string): Promise<void> {
  const rows = await prisma.personalAccessToken.findMany({
    where: { userId, kind: "extension" },
    orderBy: [{ lastUsedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    select: { id: true },
  });
  const stale = rows.slice(MAX_EXTENSION_TOKENS).map((r) => r.id);
  if (stale.length > 0) await prisma.personalAccessToken.deleteMany({ where: { id: { in: stale }, userId } });
}

export async function listPersonalAccessTokens(userId: string, kind: PersonalAccessTokenKind = "mcp"): Promise<PersonalAccessTokenRow[]> {
  return prisma.personalAccessToken.findMany({
    where: { userId, kind },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, createdAt: true, lastUsedAt: true },
  });
}

/** Scoped to the caller's own tokens, so a foreign or already-revoked id revokes nothing. */
export async function revokePersonalAccessToken(id: string, userId: string): Promise<boolean> {
  const deleted = await prisma.personalAccessToken.deleteMany({ where: { id, userId } });
  return deleted.count > 0;
}

/** Revokes the token the caller is holding (the extension's "disconnect"). Returns whether anything was revoked. */
export async function revokePersonalAccessTokenByValue(token: string): Promise<boolean> {
  if (!token.startsWith(TOKEN_PREFIX)) return false;
  const deleted = await prisma.personalAccessToken.deleteMany({ where: { tokenHash: hashToken(token) } });
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
