import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@/generated/client/client";
import { createTestDb } from "@/lib/blog-sync/test-db";

const BASE = "https://cuelara.example";

let db: PrismaClient;
let closeDb: () => Promise<void>;
let sitemap: () => Promise<{ url: string; lastModified?: Date | string }[]>;

const seed = (slug: string, over: Record<string, unknown> = {}) =>
  db.blogPost.create({
    data: { slug, title: slug, content: "body", status: "published", published: true, publishedAt: new Date("2026-01-01"), ...over },
  });

before(async () => {
  ({ db, close: closeDb } = await createTestDb());
  process.env.NEXTAUTH_URL = BASE;
  ({ default: sitemap } = await import("./sitemap"));
});

after(async () => {
  await closeDb();
});

describe("sitemap.xml", () => {
  it("lists the static public pages, and not admin, auth or noindex placeholder pages", async () => {
    const urls = (await sitemap()).map((e) => e.url);
    for (const path of ["/", "/tools", "/tools/prompt-optimizer", "/blog", "/cookbook"]) assert.ok(urls.includes(`${BASE}${path}`), path);
    for (const path of ["/admin", "/login", "/pricing", "/docs", "/privacy"]) assert.ok(!urls.some((u) => u.startsWith(`${BASE}${path}`)), path);
  });

  it("picks up newly published posts on the very next call, with lastModified", async () => {
    assert.ok(!(await sitemap()).some((e) => e.url.endsWith("/blog/fresh-post")));

    const post = await seed("fresh-post");
    const entry = (await sitemap()).find((e) => e.url === `${BASE}/blog/fresh-post`);
    assert.ok(entry);
    assert.equal(new Date(entry.lastModified as Date).getTime(), post.updatedAt.getTime());
  });

  it("excludes drafts and future-dated posts", async () => {
    await seed("a-draft", { status: "draft", published: false });
    await seed("scheduled", { publishedAt: new Date(Date.now() + 86_400_000) });
    const urls = (await sitemap()).map((e) => e.url);
    assert.ok(!urls.some((u) => u.endsWith("/blog/a-draft") || u.endsWith("/blog/scheduled")));
  });

  it("drops a post from the sitemap once it is unpublished", async () => {
    await db.blogPost.update({ where: { slug: "fresh-post" }, data: { status: "draft", published: false } });
    assert.ok(!(await sitemap()).some((e) => e.url.endsWith("/blog/fresh-post")));
  });

  it("falls back to the static pages instead of failing when the database errors", async () => {
    await db.$executeRawUnsafe('DROP TABLE "BlogPost" CASCADE');
    const urls = (await sitemap()).map((e) => e.url);
    assert.ok(urls.includes(`${BASE}/`));
    assert.ok(!urls.some((u) => u.includes("/blog/")));
  });
});
