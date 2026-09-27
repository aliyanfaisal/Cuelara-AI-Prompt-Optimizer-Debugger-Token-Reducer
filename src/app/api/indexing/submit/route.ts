import { NextResponse } from "next/server";
import { siteUrl, publishedWhere } from "@/lib/blog";
import { isAuthorizedBearer } from "@/lib/blog-sync/auth";
import { publishedCookbookWhere } from "@/lib/cookbook";
import { blogPostUrl, isIndexingConfigured, notifyGoogle, promptUrl } from "@/lib/google-indexing";
import { prisma } from "@/lib/prisma";
import { reportError } from "@/lib/error-report";

export const runtime = "nodejs";
// Each URL is one sequential call to Google, so keep batches small enough to finish inside a proxy timeout.
export const maxDuration = 60;

const STATIC_PATHS = ["/", "/tools", "/cookbook", "/blog", "/pricing", "/about", "/contact", "/privacy", "/terms"];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type Target = { url: string; kind: "prompt" | "post" | "static"; id?: string };

/**
 * Catch-up / first-time backfill: submits public URLs to Google's Indexing API in batches.
 * (New and updated content is already pinged automatically when it is published — this exists only
 * to catch anything that was missed, e.g. indexing wasn't configured yet when it was first published.)
 *
 *   curl -X POST https://cuelara.com/api/indexing/submit -H "Authorization: Bearer $PORTFOLIO_API_TOKEN" \
 *     -H "Content-Type: application/json" -d '{"dry_run": true}'
 *
 * Body (all optional):
 *   - dry_run: boolean — preview the batch, no calls made.
 *   - only_new: boolean — only URLs never successfully submitted through this endpoint before
 *     (tracked via indexingSubmittedAt). Safe to call on a recurring cron: once every record has
 *     been submitted once, later runs cost one cheap DB query and make zero Google API calls.
 *     Excludes the static paths, which this endpoint has no per-URL tracking for.
 *   - offset / limit (max 100, default 50): pagination for a manual one-off full backfill.
 *     Ignored (offset forced to 0) when only_new is set, since the "already submitted" filter
 *     already keeps each run's batch small on its own.
 * The response carries `next_offset`; repeat with it until it is null. The default daily quota is 200 URLs.
 */
export async function POST(req: Request) {
  if (!isAuthorizedBearer(req.headers.get("authorization"), process.env.PORTFOLIO_API_TOKEN)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { dry_run?: unknown; only_new?: unknown; offset?: unknown; limit?: unknown };
  const dryRun = body.dry_run === true;
  const onlyNew = body.only_new === true;
  const offset = onlyNew ? 0 : Math.max(0, Math.floor(Number(body.offset) || 0));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(Number(body.limit) || DEFAULT_LIMIT)));

  try {
    const notSubmitted = onlyNew ? { indexingSubmittedAt: null } : {};
    const [prompts, posts] = await Promise.all([
      prisma.cookbookPrompt.findMany({
        where: { ...publishedCookbookWhere(), ...notSubmitted },
        orderBy: { updatedAt: "desc" },
        select: { id: true, slug: true },
      }),
      prisma.blogPost.findMany({
        where: { ...publishedWhere(), ...notSubmitted },
        orderBy: { publishedAt: "desc" },
        select: { id: true, slug: true },
      }),
    ]);
    const all: Target[] = [
      ...prompts.map((p) => ({ url: promptUrl(p.slug), kind: "prompt" as const, id: p.id })),
      ...posts.map((p) => ({ url: blogPostUrl(p.slug), kind: "post" as const, id: p.id })),
      ...(onlyNew ? [] : STATIC_PATHS.map((path) => ({ url: `${siteUrl()}${path}`, kind: "static" as const }))),
    ];
    const batch = all.slice(offset, offset + limit);
    const nextOffset = offset + limit < all.length ? offset + limit : null;

    if (dryRun) return NextResponse.json({ dry_run: true, total: all.length, offset, next_offset: nextOffset, urls: batch.map((t) => t.url) });

    if (batch.length === 0) return NextResponse.json({ total: 0, offset, next_offset: null, submitted: 0, failed: 0, results: [] });

    if (!isIndexingConfigured()) {
      return NextResponse.json(
        { message: "Google indexing is not configured (GOOGLE_INDEXING_CREDENTIALS or CLIENT_EMAIL + PRIVATE_KEY, or the key file is unreadable)." },
        { status: 503 }
      );
    }

    const results = await notifyGoogle(batch.map((t) => t.url));
    const byUrl = new Map(batch.map((t) => [t.url, t]));

    const succeededPrompts: string[] = [];
    const succeededPosts: string[] = [];
    for (const r of results) {
      if (!r.ok) continue;
      const target = byUrl.get(r.url);
      if (target?.kind === "prompt" && target.id) succeededPrompts.push(target.id);
      else if (target?.kind === "post" && target.id) succeededPosts.push(target.id);
    }
    // Stamped so a repeated only_new call (e.g. a recurring cron) never resubmits these again.
    await Promise.all([
      succeededPrompts.length > 0 ? prisma.cookbookPrompt.updateMany({ where: { id: { in: succeededPrompts } }, data: { indexingSubmittedAt: new Date() } }) : null,
      succeededPosts.length > 0 ? prisma.blogPost.updateMany({ where: { id: { in: succeededPosts } }, data: { indexingSubmittedAt: new Date() } }) : null,
    ]);

    const failed = results.filter((r) => !r.ok);
    return NextResponse.json({
      total: all.length,
      offset,
      next_offset: nextOffset,
      submitted: results.length - failed.length,
      failed: failed.length,
      // 401/403 repeat for every URL and point at setup (Owner access, API not enabled), so surface them prominently.
      results,
    });
  } catch (error) {
    console.error("Indexing submit error:", error);
    void reportError(error, { source: "api", route: "/api/indexing/submit" });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
