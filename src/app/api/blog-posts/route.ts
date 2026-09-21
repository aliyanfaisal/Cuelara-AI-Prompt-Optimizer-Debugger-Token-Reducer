import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/blog";
import { isAuthorizedBearer } from "@/lib/blog-sync/auth";
import { blogPostPayloadSchema, formatValidationErrors } from "@/lib/blog-sync/schema";
import { upsertBlogPost } from "@/lib/blog-sync/upsert";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 1024 * 1024;

export async function POST(req: Request) {
  if (!isAuthorizedBearer(req.headers.get("authorization"), process.env.PORTFOLIO_API_TOKEN)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Informational only — external_id is what makes a delivery idempotent.
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

    const parsed = blogPostPayloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "The given data was invalid.", errors: formatValidationErrors(parsed.error) },
        { status: 422 }
      );
    }

    const { id, slug, created } = await upsertBlogPost(parsed.data);

    return NextResponse.json(
      {
        id,
        external_id: parsed.data.external_id,
        status: created ? "created" : "updated",
        url: `${siteUrl()}/blog/${slug}`,
      },
      { status: created ? 201 : 200 }
    );
  } catch (error) {
    console.error("Blog post sync error:", { idempotencyKey, error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
