import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cardSummary, plainTextSummary, postState, publishedAtFor, readingTimeMinutes } from "@/lib/blog";
import { isAuthorizedBearer } from "./auth";
import { blogPostPayloadSchema, formatValidationErrors } from "./schema";
import { resolveUniqueSlug, slugify, toLabelSlugs } from "./slug";

const valid = {
  external_id: 1,
  title: "Hello",
  slug: "hello_world-1",
  body: "# Hi",
  status: "published",
  canonical_url: "https://example.com/blog/hello",
};

describe("isAuthorizedBearer", () => {
  it("accepts the exact token", () => assert.equal(isAuthorizedBearer("Bearer secret", "secret"), true));
  it("rejects a wrong token, wrong scheme and missing header", () => {
    assert.equal(isAuthorizedBearer("Bearer nope", "secret"), false);
    assert.equal(isAuthorizedBearer("Basic secret", "secret"), false);
    assert.equal(isAuthorizedBearer(null, "secret"), false);
  });
  it("fails closed when the env var is not set", () => {
    assert.equal(isAuthorizedBearer("Bearer secret", undefined), false);
    assert.equal(isAuthorizedBearer("Bearer ", ""), false);
  });
});

describe("blogPostPayloadSchema", () => {
  it("accepts a minimal valid payload and defaults arrays", () => {
    const parsed = blogPostPayloadSchema.parse(valid);
    assert.deepEqual([parsed.categories, parsed.tags], [[], []]);
  });
  it("accepts Laravel-style ISO-8601 dates with offsets and microseconds", () => {
    for (const published_at of ["2026-09-21T10:00:00+00:00", "2026-09-21T10:00:00.000000Z", null]) {
      assert.ok(blogPostPayloadSchema.safeParse({ ...valid, published_at }).success, String(published_at));
    }
  });
  it("reports per-field errors", () => {
    const result = blogPostPayloadSchema.safeParse({
      ...valid,
      external_id: "1",
      slug: "has spaces",
      title: "x".repeat(256),
      excerpt: "x".repeat(501),
      status: "archived",
      image_url: "ftp://example.com/a.png",
      canonical_url: "javascript:alert(1)",
    });
    assert.ok(!result.success);
    const fields = Object.keys(formatValidationErrors(result.error));
    for (const f of ["external_id", "slug", "title", "excerpt", "status", "image_url", "canonical_url"]) {
      assert.ok(fields.includes(f), `expected an error for ${f}`);
    }
  });
});

describe("slug helpers", () => {
  it("slugifies names", () => {
    assert.equal(slugify("  Prompt Engineering & AI! "), "prompt-engineering-ai");
    assert.equal(slugify("Café Déjà Vu"), "cafe-deja-vu");
    assert.equal(slugify("🔥"), "");
  });
  it("de-duplicates labels by slug and drops empty ones", () => {
    assert.deepEqual(toLabelSlugs(["AI Tools", "ai-tools", "🔥", "Next.js"]), [
      { slug: "ai-tools", name: "AI Tools" },
      { slug: "next-js", name: "Next.js" },
    ]);
  });
  it("appends -2, -3, ... until free", async () => {
    const taken = new Set(["post", "post-2"]);
    assert.equal(await resolveUniqueSlug("post", async (s) => taken.has(s)), "post-3");
    assert.equal(await resolveUniqueSlug("fresh", async (s) => taken.has(s)), "fresh");
  });
});

describe("blog card helpers", () => {
  it("summarizes Markdown as plain text and truncates", () => {
    assert.equal(plainTextSummary("## Title\n\nSome **bold** [link](https://x.y) text ![img](a.png)"), "Title Some bold link text");
    assert.equal(plainTextSummary("a".repeat(300)), `${"a".repeat(200)}…`);
  });
  it("estimates reading time at ~200 wpm, minimum 1 minute", () => {
    assert.equal(readingTimeMinutes("one two"), 1);
    assert.equal(readingTimeMinutes("word ".repeat(1000)), 5);
  });
  it("prefers the excerpt, then the stored teaser, for cards", () => {
    assert.equal(cardSummary({ excerpt: " Hi ", teaser: "t" }), "Hi");
    assert.equal(cardSummary({ excerpt: null, teaser: "t" }), "t");
    assert.equal(cardSummary({ excerpt: null, teaser: null }), "");
  });
});

describe("admin publish rules", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  const past = new Date("2026-01-01T00:00:00Z");
  const future = new Date("2027-01-01T00:00:00Z");

  it("publishing stamps now for drafts without a date and for scheduled posts, keeping past dates", () => {
    assert.equal(publishedAtFor("published", null, now), now);
    assert.equal(publishedAtFor("published", future, now), now);
    assert.equal(publishedAtFor("published", past, now), past);
  });
  it("unpublishing never touches the date", () => {
    assert.equal(publishedAtFor("draft", past, now), past);
    assert.equal(publishedAtFor("draft", null, now), null);
  });
  it("derives live / scheduled / draft", () => {
    assert.equal(postState("draft", past), "draft");
    assert.equal(postState("published", past), "live");
    assert.equal(postState("published", new Date(Date.now() + 86_400_000)), "scheduled");
    assert.equal(postState("published", null), "scheduled");
  });
});
