import assert from "node:assert/strict";
import Module from "node:module";
import { afterEach, describe, it, mock } from "node:test";

// server-only throws outside a Next build; stub it so the module can be exercised directly.
const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function (request: unknown, ...rest: unknown[]) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, ...rest);
};

const load = () => import("./turnstile");

function mockCloudflare(respond: (body: URLSearchParams) => Response | Promise<Response>) {
  const calls: URLSearchParams[] = [];
  mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    const body = init.body as URLSearchParams;
    calls.push(body);
    return respond(body);
  });
  return calls;
}

afterEach(() => {
  mock.restoreAll();
  delete process.env.TURNSTILE_SECRET_KEY;
  delete process.env.TURNSTILE_SITE_KEY;
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
});

describe("verifyTurnstile", () => {
  it("skips the check entirely when no secret is configured", async () => {
    const calls = mockCloudflare(() => new Response("{}"));
    const { verifyTurnstile } = await load();
    assert.equal(await verifyTurnstile(undefined), true);
    assert.equal(calls.length, 0);
  });

  it("rejects a missing, empty or oversized token without calling Cloudflare", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    const calls = mockCloudflare(() => new Response(JSON.stringify({ success: true })));
    const { verifyTurnstile } = await load();
    assert.equal(await verifyTurnstile(undefined), false);
    assert.equal(await verifyTurnstile(""), false);
    assert.equal(await verifyTurnstile("x".repeat(5000)), false);
    assert.equal(calls.length, 0);
  });

  it("accepts a token Cloudflare confirms, sending the secret, token and IP", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    const calls = mockCloudflare(() => new Response(JSON.stringify({ success: true })));
    const { verifyTurnstile } = await load();
    assert.equal(await verifyTurnstile("tok", "203.0.113.9"), true);
    assert.equal(calls[0].get("secret"), "secret");
    assert.equal(calls[0].get("response"), "tok");
    assert.equal(calls[0].get("remoteip"), "203.0.113.9");
  });

  it("rejects a token Cloudflare says is invalid", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    mockCloudflare(() => new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] })));
    const { verifyTurnstile } = await load();
    assert.equal(await verifyTurnstile("bad"), false);
  });

  it("doesn't send an unknown IP", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    const calls = mockCloudflare(() => new Response(JSON.stringify({ success: true })));
    const { verifyTurnstile } = await load();
    await verifyTurnstile("tok", "unknown");
    assert.equal(calls[0].has("remoteip"), false);
  });

  it("lets people through (and says so in the log) when Cloudflare is down, instead of locking everyone out", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    mock.method(console, "error", () => {});
    mockCloudflare(() => new Response("oops", { status: 503 }));
    const { verifyTurnstile } = await load();
    assert.equal(await verifyTurnstile("tok"), true);

    mock.restoreAll();
    mock.method(console, "error", () => {});
    mock.method(globalThis, "fetch", async () => {
      throw new Error("network down");
    });
    assert.equal(await verifyTurnstile("tok"), true);
  });
});

describe("turnstileSiteKey", () => {
  it("is null unless both the secret and a site key are set", async () => {
    const { turnstileSiteKey } = await load();
    assert.equal(turnstileSiteKey(), null);
    process.env.TURNSTILE_SITE_KEY = "site";
    assert.equal(turnstileSiteKey(), null); // no secret: never show a widget nothing verifies
    process.env.TURNSTILE_SECRET_KEY = "secret";
    assert.equal(turnstileSiteKey(), "site");
  });

  it("falls back to the NEXT_PUBLIC_ name", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "pub";
    const { turnstileSiteKey } = await load();
    assert.equal(turnstileSiteKey(), "pub");
  });
});
