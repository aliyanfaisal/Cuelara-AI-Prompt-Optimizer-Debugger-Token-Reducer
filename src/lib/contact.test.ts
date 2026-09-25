import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { after, before, describe, it, mock } from "node:test";
import type { PrismaClient } from "@/generated/client/client";
import { createTestDb } from "@/lib/blog-sync/test-db";

let db: PrismaClient;
let closeDb: () => Promise<void>;
let POST: (req: Request) => Promise<Response>;

// "server-only" throws outside a Next.js server build, so stub it before src/lib/email.ts loads.
const nodeRequire = createRequire(__filename);
const serverOnly = nodeRequire.resolve("server-only");
nodeRequire.cache[serverOnly] = { id: serverOnly, filename: serverOnly, loaded: true, exports: {} } as NodeJS.Module;

let failSending = false;
const sent: { type: string; to: string; subject: string; replyTo?: string }[] = [];

const body = (over: Record<string, unknown> = {}) => ({
  name: "Ada Lovelace",
  email: "ada@example.com",
  subject: "Pro plan enquiry",
  message: "Can we get a team discount for ten seats?",
  plan: "pro",
  ...over,
});

const send = (payload: unknown) =>
  POST(new Request("http://localhost/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: typeof payload === "string" ? payload : JSON.stringify(payload) }));

before(async () => {
  ({ db, close: closeDb } = await createTestDb());
  // No SMTP in tests: capture what would have been sent instead.
  const nodemailer = (await import("nodemailer")).default;
  mock.method(nodemailer, "createTransport", () => ({
    sendMail: async (m: { to: string; subject: string; replyTo?: string }) => {
      if (failSending) throw new Error("smtp down");
      sent.push({ type: "mail", to: m.to, subject: m.subject, replyTo: m.replyTo });
    },
  }));
  Object.assign(process.env, { SMTP_HOST: "h", SMTP_PORT: "465", SMTP_USER: "team@cuelara.example", SMTP_PASS: "x" });
  ({ POST } = await import("@/app/api/contact/route"));
});

after(async () => {
  mock.restoreAll();
  await closeDb();
});

describe("POST /api/contact", () => {
  it("rejects invalid input with 422 and stores nothing", async () => {
    assert.equal((await send(body({ email: "nope" }))).status, 422);
    assert.equal((await send(body({ message: "short" }))).status, 422);
    assert.equal((await send("{bad")).status, 400);
    assert.equal(await db.contactMessage.count(), 0);
  });

  it("stores the message, emails the team with Reply-To, and confirms to the sender", async () => {
    const res = await send(body());
    assert.equal(res.status, 200);

    const row = await db.contactMessage.findFirstOrThrow();
    assert.equal(row.email, "ada@example.com");
    assert.equal(row.plan, "pro");
    assert.equal(row.isRead, false);
    assert.equal(row.emailSent, true);

    const toTeam = sent.find((m) => m.to === "team@cuelara.example");
    const toSender = sent.find((m) => m.to === "ada@example.com");
    assert.equal(toTeam?.replyTo, "ada@example.com");
    assert.ok(toTeam?.subject.includes("Pro plan enquiry"));
    assert.ok(toSender);
    assert.equal(await db.emailLog.count({ where: { type: "contact", success: true } }), 2);
  });

  it("silently drops honeypot submissions", async () => {
    const before = await db.contactMessage.count();
    assert.equal((await send(body({ email: "bot@example.com", website: "http://spam" }))).status, 200);
    assert.equal(await db.contactMessage.count(), before);
  });

  it("still saves the message when email delivery fails", async () => {
    failSending = true;
    const res = await send(body({ email: "grace@example.com" }));
    failSending = false;
    assert.equal(res.status, 200);
    const row = await db.contactMessage.findFirstOrThrow({ where: { email: "grace@example.com" } });
    assert.equal(row.emailSent, false);
    assert.ok((await db.emailLog.count({ where: { type: "contact", success: false } })) >= 1);
  });

  it("rate limits repeated messages from the same address", async () => {
    for (let i = 0; i < 3; i++) await db.contactMessage.create({ data: { name: "Spam", email: "spam@example.com", message: "message number " + i } });
    assert.equal((await send(body({ email: "spam@example.com" }))).status, 429);
  });
});

describe("POST /api/contact with Cloudflare Turnstile enabled", () => {
  const withTurnstile = async (verdict: boolean, run: () => Promise<void>) => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    const seen: string[] = [];
    mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
      seen.push((init.body as URLSearchParams).get("response") ?? "");
      return new Response(JSON.stringify({ success: verdict }));
    });
    try {
      await run();
    } finally {
      delete process.env.TURNSTILE_SECRET_KEY;
      (globalThis.fetch as unknown as { mock?: { restore(): void } }).mock?.restore();
    }
    return seen;
  };

  it("rejects a submission with no token, or one Cloudflare refuses, and stores nothing", async () => {
    const before = await db.contactMessage.count();
    await withTurnstile(false, async () => {
      assert.equal((await send(body({ email: "notoken@example.com" }))).status, 400);
      assert.equal((await send(body({ email: "badtoken@example.com", turnstileToken: "bad" }))).status, 400);
    });
    assert.equal(await db.contactMessage.count(), before);
  });

  it("accepts a valid token and doesn't treat it as part of the message", async () => {
    const seen = await withTurnstile(true, async () => {
      const res = await send(body({ email: "human@example.com", turnstileToken: "good-token" }));
      assert.equal(res.status, 200);
    });
    assert.deepEqual(seen, ["good-token"]);
    assert.ok(await db.contactMessage.findFirst({ where: { email: "human@example.com" } }));
  });
});
