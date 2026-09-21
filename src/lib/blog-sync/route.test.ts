import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@/generated/client/client";

// The BlogPost table as it existed before this feature; the real migration is applied on top of it.
const LEGACY_BLOG_POST = `
CREATE TABLE "BlogPost" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "slug" TEXT NOT NULL, "content" TEXT NOT NULL,
  "excerpt" TEXT, "published" BOOLEAN NOT NULL DEFAULT false, "seoTitle" TEXT, "seoDesc" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");
`;
const TOKEN = "test-token";

let pg: PGlite;
let db: PrismaClient;
let POST: (req: Request) => Promise<Response>;

const payload = (over: Record<string, unknown> = {}) => ({
  external_id: 100,
  title: "First post",
  slug: "first-post",
  excerpt: "Short",
  body: "## Heading\n\nBody",
  status: "published",
  image_url: "https://portfolio.example/img/a.png",
  source_image_url: "https://images.example/orig.png",
  categories: ["Guides", "AI Tools"],
  tags: ["laravel", "next"],
  published_at: "2026-01-01T10:00:00+00:00",
  canonical_url: "https://portfolio.example/blog/first-post",
  ...over,
});

const send = (body: unknown, headers: Record<string, string> = { authorization: `Bearer ${TOKEN}` }) =>
  POST(
    new Request("http://localhost/api/blog-posts", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );

before(async () => {
  pg = new PGlite();
  await pg.exec(LEGACY_BLOG_POST);
  await pg.exec(readFileSync("prisma/migrations/20260921000000_blog_portfolio_sync/migration.sql", "utf8"));
  db = new PrismaClient({ adapter: new PrismaPGlite(pg) });

  // src/lib/prisma.ts reuses this global, so the route under test talks to the in-memory database.
  (globalThis as unknown as { prisma: PrismaClient }).prisma = db;
  process.env.PORTFOLIO_API_TOKEN = TOKEN;
  process.env.NEXTAUTH_URL = "https://cuelara.example";
  ({ POST } = await import("@/app/api/blog-posts/route"));
});

after(async () => {
  await db.$disconnect();
  await pg.close();
});

describe("POST /api/blog-posts", () => {
  it("returns 401 without a valid token", async () => {
    const badHeaders: Record<string, string>[] = [{}, { authorization: "Bearer wrong" }];
    for (const headers of badHeaders) {
      const res = await send(payload(), headers);
      assert.equal(res.status, 401);
      assert.deepEqual(await res.json(), { message: "Unauthorized" });
    }
    assert.equal(await db.blogPost.count(), 0);
  });

  it("returns 422 with per-field errors for an invalid payload", async () => {
    const res = await send(payload({ title: "", slug: "bad slug", status: "nope" }));
    assert.equal(res.status, 422);
    const json = await res.json();
    assert.ok(json.message);
    assert.deepEqual(Object.keys(json.errors).sort(), ["slug", "status", "title"]);
    assert.ok(Array.isArray(json.errors.title));
  });

  it("returns 400 for malformed JSON and 413 for oversized bodies", async () => {
    assert.equal((await send("{not json")).status, 400);
    assert.equal((await send(payload({ body: "x".repeat(1024 * 1024 + 1) }))).status, 413);
  });

  it("creates a post with categories and tags (201)", async () => {
    const res = await send(payload());
    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.status, "created");
    assert.equal(json.external_id, 100);
    assert.equal(json.url, "https://cuelara.example/blog/first-post");

    const post = await db.blogPost.findUniqueOrThrow({
      where: { id: json.id },
      include: { categories: true, tags: true },
    });
    assert.equal(post.content, "## Heading\n\nBody");
    assert.equal(post.status, "published");
    assert.equal(post.published, true);
    assert.equal(post.imageUrl, "https://portfolio.example/img/a.png");
    assert.equal(post.sourceImageUrl, "https://images.example/orig.png");
    assert.equal(post.canonicalUrl, "https://portfolio.example/blog/first-post");
    assert.equal(post.publishedAt?.toISOString(), "2026-01-01T10:00:00.000Z");
    assert.deepEqual(post.categories.map((c) => c.slug).sort(), ["ai-tools", "guides"]);
    assert.deepEqual(post.tags.map((t) => t.slug).sort(), ["laravel", "next"]);
  });

  it("updates the same external_id without duplicating, keeping the slug and replacing associations (200)", async () => {
    const res = await send(
      payload({ title: "Renamed", slug: "a-different-slug", tags: ["next", "prisma"], categories: [], status: "draft" })
    );
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.status, "updated");
    assert.equal(json.url, "https://cuelara.example/blog/first-post");

    assert.equal(await db.blogPost.count({ where: { externalId: 100 } }), 1);
    const post = await db.blogPost.findUniqueOrThrow({
      where: { externalId: 100 },
      include: { categories: true, tags: true },
    });
    assert.equal(post.title, "Renamed");
    assert.equal(post.slug, "first-post");
    assert.equal(post.status, "draft");
    assert.equal(post.published, false);
    assert.equal(post.categories.length, 0);
    assert.deepEqual(post.tags.map((t) => t.slug).sort(), ["next", "prisma"]);
    // Labels are shared, not duplicated.
    assert.equal(await db.blogTag.count({ where: { slug: "next" } }), 1);
  });

  it("appends -2, -3 when another post already uses the slug", async () => {
    const second = await (await send(payload({ external_id: 101 }))).json();
    const third = await (await send(payload({ external_id: 102 }))).json();
    assert.equal(second.url, "https://cuelara.example/blog/first-post-2");
    assert.equal(third.url, "https://cuelara.example/blog/first-post-3");
    assert.equal(await db.blogPost.count(), 3);
  });

  it("never creates duplicates for concurrent deliveries of the same post", async () => {
    const responses = await Promise.all([1, 2, 3].map(() => send(payload({ external_id: 200, slug: "race" }))));
    assert.ok(responses.every((r) => r.status === 200 || r.status === 201));
    assert.equal(responses.filter((r) => r.status === 201).length, 1);
    assert.equal(await db.blogPost.count({ where: { externalId: 200 } }), 1);
  });

  it("stamps published_at when a published post arrives without one", async () => {
    await send(payload({ external_id: 300, slug: "no-date", published_at: null }));
    const post = await db.blogPost.findUniqueOrThrow({ where: { externalId: 300 } });
    assert.ok(post.publishedAt);
  });
});
