import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@/generated/client/client";
import { createTestDb } from "@/lib/blog-sync/test-db";

let db: PrismaClient;
let closeDb: () => Promise<void>;
let POST: (req: Request) => Promise<Response>;

const call = (body: unknown, auth = "Bearer test-token") =>
  POST(new Request("http://localhost/api/indexing/submit", { method: "POST", headers: { authorization: auth, "content-type": "application/json" }, body: JSON.stringify(body) }));

before(async () => {
  ({ db, close: closeDb } = await createTestDb());
  process.env.PORTFOLIO_API_TOKEN = "test-token";
  process.env.NEXTAUTH_URL = "https://cuelara.example";
  delete process.env.GOOGLE_INDEXING_CREDENTIALS;
  delete process.env.GOOGLE_INDEXING_CLIENT_EMAIL;
  const category = await db.cookbookCategory.create({ data: { name: "Engineering", slug: "engineering" } });
  const base = { categoryId: category.id, explanation: "e", whenToUse: "w", commonMistakes: "c", bestPractices: "b", promptTemplate: "p", exampleInput: "i", exampleOutput: "o" };
  await db.cookbookPrompt.create({ data: { ...base, title: "Live", slug: "live", published: true } });
  await db.cookbookPrompt.create({ data: { ...base, title: "Draft", slug: "draft", published: false } });
  ({ POST } = await import("@/app/api/indexing/submit/route"));
});

after(async () => {
  await closeDb();
});

describe("POST /api/indexing/submit", () => {
  it("requires the bearer token", async () => {
    assert.equal((await call({}, "Bearer nope")).status, 401);
  });

  it("dry run lists published prompts and static pages, never drafts, and pages through batches", async () => {
    const json = await (await call({ dry_run: true })).json();
    assert.ok(json.urls.includes("https://cuelara.example/prompt/live"));
    assert.ok(json.urls.includes("https://cuelara.example/pricing"));
    assert.ok(!json.urls.some((u: string) => u.endsWith("/draft")));
    assert.equal(json.next_offset, null);

    const page = await (await call({ dry_run: true, limit: 2 })).json();
    assert.equal(page.urls.length, 2);
    assert.equal(page.next_offset, 2);
    assert.equal((await (await call({ dry_run: true, offset: 2, limit: 2 })).json()).offset, 2);
  });

  it("returns 503 when Google credentials are not configured", async () => {
    assert.equal((await call({})).status, 503);
  });
});
