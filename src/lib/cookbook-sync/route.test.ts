import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@/generated/client/client";
import { createTestDb } from "@/lib/blog-sync/test-db";

const TOKEN = "test-token";

let db: PrismaClient;
let closeDb: () => Promise<void>;
let POST: (req: Request) => Promise<Response>;
let GET: (req: Request) => Promise<Response>;

const faqs = "### What is it?\nA prompt.\n\n### Who is it for?\nDevelopers.\n\n### Does it work with Claude?\nYes.";

const payload = (over: Record<string, unknown> = {}) => ({
  external_id: 1,
  title: "Senior React Developer Persona",
  slug: "senior-react-persona",
  category: "engineering",
  explanation: "A **system prompt** for React.",
  when_to_use: "- Scaffolding components",
  best_practices: "- Name versions",
  common_mistakes: "- Vague tasks",
  prompt_template: "You are a Senior Frontend Engineer.\n\nTask: [TASK]",
  example_input: "Task: a button",
  example_output: "```tsx\nexport const B = () => <button />;\n```",
  faqs,
  seo_title: "Senior React Developer Prompt for Claude & ChatGPT",
  seo_desc: "A copy-paste system prompt that makes ChatGPT or Claude write clean, modern React with TypeScript and Tailwind. Includes an example.",
  image_url: "https://portfolio.example/img/react.png",
  published: true,
  ...over,
});

const headers: Record<string, string> = { authorization: `Bearer ${TOKEN}` };
const send = (body: unknown, h: Record<string, string> = headers) =>
  POST(
    new Request("http://localhost/api/cookbook-prompts", {
      method: "POST",
      headers: { "content-type": "application/json", ...h },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );

before(async () => {
  ({ db, close: closeDb } = await createTestDb());
  process.env.PORTFOLIO_API_TOKEN = TOKEN;
  process.env.NEXTAUTH_URL = "https://cuelara.example";
  await db.cookbookCategory.createMany({
    data: [
      { name: "Engineering", slug: "engineering" },
      { name: "Marketing & Sales", slug: "marketing" },
    ],
  });
  ({ POST, GET } = await import("@/app/api/cookbook-prompts/route"));
});

after(async () => {
  await closeDb();
});

describe("/api/cookbook-prompts", () => {
  it("returns 401 without a valid token", async () => {
    for (const h of [{} as Record<string, string>, { authorization: "Bearer wrong" }]) {
      assert.equal((await send(payload(), h)).status, 401);
      assert.equal((await GET(new Request("http://localhost/api/cookbook-prompts", { headers: h }))).status, 401);
    }
    assert.equal(await db.cookbookPrompt.count(), 0);
  });

  it("returns 422 with per-field errors for an invalid payload", async () => {
    const res = await send(payload({ title: "", slug: "bad slug", seo_desc: "too short", faqs: "### Only one\nAnswer" }));
    assert.equal(res.status, 422);
    const json = await res.json();
    assert.deepEqual(Object.keys(json.errors).sort(), ["faqs", "seo_desc", "slug", "title"]);
  });

  it("returns 400 for malformed JSON and 413 for oversized bodies", async () => {
    assert.equal((await send("{not json")).status, 400);
    assert.equal((await send(payload({ explanation: "x".repeat(1024 * 1024 + 1) }))).status, 413);
  });

  it("rejects an unknown category with 422 instead of creating it", async () => {
    const res = await send(payload({ category: "nope" }));
    assert.equal(res.status, 422);
    assert.ok((await res.json()).errors.category);
    assert.equal(await db.cookbookCategory.count(), 2);
    assert.equal(await db.cookbookPrompt.count(), 0);
  });

  it("creates a published prompt (201) with every field stored", async () => {
    const res = await send(payload());
    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.status, "created");
    assert.equal(json.external_id, 1);
    assert.equal(json.url, "https://cuelara.example/prompt/senior-react-persona");

    const p = await db.cookbookPrompt.findUniqueOrThrow({ where: { id: json.id }, include: { category: true } });
    assert.equal(p.category.slug, "engineering");
    assert.equal(p.published, true);
    assert.equal(p.image, "https://portfolio.example/img/react.png");
    assert.equal(p.whenToUse, "- Scaffolding components");
    assert.equal(p.promptTemplate, "You are a Senior Frontend Engineer.\n\nTask: [TASK]");
    assert.equal(p.faqs, faqs);
    assert.equal(p.seoTitle, "Senior React Developer Prompt for Claude & ChatGPT");
  });

  it("updates the same external_id without duplicating and keeps the slug (200)", async () => {
    const res = await send(payload({ title: "Renamed", slug: "other-slug", category: "marketing", published: false, image_url: null }));
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.status, "updated");
    assert.equal(json.url, "https://cuelara.example/prompt/senior-react-persona");

    assert.equal(await db.cookbookPrompt.count({ where: { externalId: 1 } }), 1);
    const p = await db.cookbookPrompt.findUniqueOrThrow({ where: { externalId: 1 }, include: { category: true } });
    assert.equal(p.title, "Renamed");
    assert.equal(p.category.slug, "marketing");
    assert.equal(p.published, false);
    assert.equal(p.image, null);
  });

  it("appends -2 when a different prompt already uses the slug", async () => {
    const json = await (await send(payload({ external_id: 2 }))).json();
    assert.equal(json.url, "https://cuelara.example/prompt/senior-react-persona-2");
  });

  it("never creates duplicates for concurrent deliveries of the same prompt", async () => {
    const responses = await Promise.all([1, 2, 3].map(() => send(payload({ external_id: 50, slug: "race" }))));
    assert.ok(responses.every((r) => r.status === 200 || r.status === 201));
    assert.equal(responses.filter((r) => r.status === 201).length, 1);
    assert.equal(await db.cookbookPrompt.count({ where: { externalId: 50 } }), 1);
  });

  it("GET lists categories, existing prompts and the next free external_id", async () => {
    const res = await GET(new Request("http://localhost/api/cookbook-prompts", { headers }));
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.next_external_id, 51);
    assert.deepEqual(json.categories.map((c: { slug: string }) => c.slug), ["engineering", "marketing"]);
    assert.ok(json.prompts.some((p: { external_id: number; slug: string }) => p.external_id === 2 && p.slug === "senior-react-persona-2"));
  });
});
