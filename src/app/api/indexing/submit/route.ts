import { NextResponse } from "next/server";
import { siteUrl, publishedWhere } from "@/lib/blog";
import { isAuthorizedBearer } from "@/lib/blog-sync/auth";
import { publishedCookbookWhere } from "@/lib/cookbook";
import { blogPostUrl, isIndexingConfigured, notifyGoogle, promptUrl } from "@/lib/google-indexing";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
// Each URL is one sequential call to Google, so keep batches small enough to finish inside a proxy timeout.
export const maxDuration = 60;

const STATIC_PATHS = ["/", "/tools", "/cookbook", "/blog", "/pricing", "/about", "/contact", "/privacy", "/terms"];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Catch-up / first-time backfill: submits public URLs to Google's Indexing API in batches.
 * (New and updated content is already pinged automatically when it is published.)
 *
 *   curl -X POST https://cuelara.com/api/indexing/submit -H "Authorization: Bearer $PORTFOLIO_API_TOKEN" \
 *     -H "Content-Type: application/json" -d '{"dry_run": true}'
 *
 * Body (all optional): { "dry_run": boolean, "offset": number, "limit": number (max 100, default 50) }.
 * The response carries `next_offset`; repeat with it until it is null. The default daily quota is 200 URLs.
 */
export async function POST(req: Request) {
  if (!isAuthorizedBearer(req.headers.get("authorization"), process.env.PORTFOLIO_API_TOKEN)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { dry_run?: unknown; offset?: unknown; limit?: unknown };
  const dryRun = body.dry_run === true;
  const offset = Math.max(0, Math.floor(Number(body.offset) || 0));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(Number(body.limit) || DEFAULT_LIMIT)));

  try {
    const [prompts, posts] = await Promise.all([
      prisma.cookbookPrompt.findMany({ where: publishedCookbookWhere(), orderBy: { updatedAt: "desc" }, select: { slug: true } }),
      prisma.blogPost.findMany({ where: publishedWhere(), orderBy: { publishedAt: "desc" }, select: { slug: true } }),
    ]);
    const all = [
      ...prompts.map((p) => promptUrl(p.slug)),
      ...posts.map((p) => blogPostUrl(p.slug)),
      ...STATIC_PATHS.map((path) => `${siteUrl()}${path}`),
    ];
    const batch = all.slice(offset, offset + limit);
    const nextOffset = offset + limit < all.length ? offset + limit : null;

    if (dryRun) return NextResponse.json({ dry_run: true, total: all.length, offset, next_offset: nextOffset, urls: batch });

    if (!isIndexingConfigured()) {
      return NextResponse.json(
        { message: "Google indexing is not configured (GOOGLE_INDEXING_CREDENTIALS or CLIENT_EMAIL + PRIVATE_KEY, or the key file is unreadable)." },
        { status: 503 }
      );
    }

    const results = await notifyGoogle(batch);
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
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
