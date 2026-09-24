import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/blog";
import { isAuthorizedBearer } from "@/lib/blog-sync/auth";
import { formatValidationErrors } from "@/lib/blog-sync/schema";
import { cookbookPromptPayloadSchema } from "@/lib/cookbook-sync/schema";
import { UnknownCategoryError, upsertCookbookPrompt } from "@/lib/cookbook-sync/upsert";
import { notifyGoogle, promptUrl } from "@/lib/google-indexing";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 1024 * 1024;

const isAuthorized = (req: Request) => isAuthorizedBearer(req.headers.get("authorization"), process.env.PORTFOLIO_API_TOKEN);

export async function POST(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  // Informational only: external_id is what makes a delivery idempotent.
  const idempotencyKey = req.headers.get("idempotency-key");

  try {
    const tooLarge = NextResponse.json({ message: "Payload too large." }, { status: 413 });
    if (Number(req.headers.get("content-length")) > MAX_BODY_BYTES) return tooLarge;
    const raw = await req.text();
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return tooLarge;

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return NextResponse.json({ message: "Malformed JSON body." }, { status: 400 });
    }

    const parsed = cookbookPromptPayloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "The given data was invalid.", errors: formatValidationErrors(parsed.error) }, { status: 422 });
    }

    const { id, slug, created } = await upsertCookbookPrompt(parsed.data);

    // /cookbook, /prompt/[slug] and the sitemap are all dynamic, so the page and its sitemap entry are live already.
    // Fire and forget: a Google hiccup must not fail the delivery.
    if (parsed.data.published) void notifyGoogle(promptUrl(slug));
    return NextResponse.json(
      { id, external_id: parsed.data.external_id, status: created ? "created" : "updated", url: `${siteUrl()}/prompt/${slug}` },
      { status: created ? 201 : 200 }
    );
  } catch (error) {
    if (error instanceof UnknownCategoryError) {
      return NextResponse.json(
        { message: "The given data was invalid.", errors: { category: [`No category with slug "${error.slug}". Use one from GET /api/cookbook-prompts.`] } },
        { status: 422 }
      );
    }
    console.error("Cookbook prompt sync error:", { idempotencyKey, error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

/**
 * What the publishing automation needs before writing a post: valid category slugs, what already exists
 * (to avoid duplicate topics), and the next free external_id.
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const [prompts, categories, last] = await Promise.all([
      prisma.cookbookPrompt.findMany({
        orderBy: { createdAt: "desc" },
        take: 1000,
        select: { externalId: true, slug: true, title: true, published: true, category: { select: { slug: true } } },
      }),
      prisma.cookbookCategory.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true, parentId: true, _count: { select: { prompts: true } } } }),
      prisma.cookbookPrompt.aggregate({ _max: { externalId: true } }),
    ]);

    return NextResponse.json({
      next_external_id: (last._max.externalId ?? 0) + 1,
      categories: categories.map((c) => ({ slug: c.slug, name: c.name, is_top_level: c.parentId === null, prompt_count: c._count.prompts })),
      prompts: prompts.map((p) => ({ external_id: p.externalId, slug: p.slug, title: p.title, category: p.category.slug, published: p.published })),
    });
  } catch (error) {
    console.error("Cookbook prompt list error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
