import assert from "node:assert/strict";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, before, beforeEach, describe, it, mock } from "node:test";
import { isIndexingConfigured, notifyGoogle } from "./google-indexing";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const PEM = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

type Call = { url: string; init: RequestInit };
let calls: Call[];
let publishStatus = 200;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

before(() => {
  mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    if (String(url).includes("oauth2.googleapis.com")) return json({ access_token: "tok", expires_in: 3600 });
    return publishStatus === 200 ? json({}) : json({ error: { message: "Permission denied" } }, publishStatus);
  });
});

beforeEach(() => {
  calls = [];
  publishStatus = 200;
  process.env.GOOGLE_INDEXING_CLIENT_EMAIL = "indexer@proj.iam.gserviceaccount.com";
  // Stored on one line with literal \n, as it would be in an .env file.
  process.env.GOOGLE_INDEXING_PRIVATE_KEY = PEM.replace(/\n/g, "\\n");
});

afterEach(() => {
  delete process.env.GOOGLE_INDEXING_CLIENT_EMAIL;
  delete process.env.GOOGLE_INDEXING_PRIVATE_KEY;
  delete process.env.GOOGLE_INDEXING_CREDENTIALS;
});

describe("notifyGoogle", () => {
  it("does nothing when not configured", async () => {
    delete process.env.GOOGLE_INDEXING_CLIENT_EMAIL;
    assert.equal(isIndexingConfigured(), false);
    assert.deepEqual(await notifyGoogle("https://cuelara.com/prompt/x"), []);
    assert.equal(calls.length, 0);
  });

  it("signs a valid RS256 JWT and publishes the URL with the access token", async () => {
    const results = await notifyGoogle("https://cuelara.com/prompt/x");
    assert.deepEqual(results, [{ url: "https://cuelara.com/prompt/x", ok: true, status: 200 }]);

    const assertion = new URLSearchParams(String(calls[0].init.body)).get("assertion")!;
    const [header, claims, signature] = assertion.split(".");
    assert.equal(JSON.parse(Buffer.from(header, "base64url").toString()).alg, "RS256");
    const payload = JSON.parse(Buffer.from(claims, "base64url").toString());
    assert.equal(payload.iss, "indexer@proj.iam.gserviceaccount.com");
    assert.equal(payload.scope, "https://www.googleapis.com/auth/indexing");
    assert.ok(createVerify("RSA-SHA256").update(`${header}.${claims}`).verify(publicKey, Buffer.from(signature, "base64url")));

    const publish = calls.find((c) => c.url.includes("indexing.googleapis.com"))!;
    assert.equal((publish.init.headers as Record<string, string>).authorization, "Bearer tok");
    assert.deepEqual(JSON.parse(String(publish.init.body)), { url: "https://cuelara.com/prompt/x", type: "URL_UPDATED" });
  });

  it("reuses the cached access token and de-duplicates URLs", async () => {
    await notifyGoogle(["https://cuelara.com/a", "https://cuelara.com/a", "https://cuelara.com/b"], "URL_DELETED");
    assert.equal(calls.filter((c) => c.url.includes("oauth2")).length, 0);
    const bodies = calls.map((c) => JSON.parse(String(c.init.body)));
    assert.deepEqual(bodies, [
      { url: "https://cuelara.com/a", type: "URL_DELETED" },
      { url: "https://cuelara.com/b", type: "URL_DELETED" },
    ]);
  });

  it("reads credentials from a JSON key file path", async () => {
    delete process.env.GOOGLE_INDEXING_CLIENT_EMAIL;
    delete process.env.GOOGLE_INDEXING_PRIVATE_KEY;
    const file = join(mkdtempSync(join(tmpdir(), "gi-")), "key.json");
    writeFileSync(file, JSON.stringify({ client_email: "bot@proj.iam.gserviceaccount.com", private_key: PEM }));
    process.env.GOOGLE_INDEXING_CREDENTIALS = file;

    assert.equal(isIndexingConfigured(), true);
    const [result] = await notifyGoogle("https://cuelara.com/from-file");
    assert.equal(result.ok, true);
  });

  it("is a no-op when the credentials file is missing", async () => {
    process.env.GOOGLE_INDEXING_CREDENTIALS = "/nonexistent/key.json";
    assert.equal(isIndexingConfigured(), false);
    assert.deepEqual(await notifyGoogle("https://cuelara.com/x"), []);
  });

  it("skips localhost URLs", async () => {
    assert.deepEqual(await notifyGoogle("http://localhost:3000/prompt/x"), []);
    assert.equal(calls.length, 0);
  });

  it("reports API errors instead of throwing", async () => {
    publishStatus = 403;
    const [result] = await notifyGoogle("https://cuelara.com/prompt/x");
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
    assert.equal(result.error, "Permission denied");
  });
});
