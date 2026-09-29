import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** One-click unsubscribe: the link in the welcome/newsletter email carries the subscriber's id. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    await prisma.newsletterSubscriber.updateMany({ where: { id }, data: { unsubscribedAt: new Date() } }).catch(() => {});
  }
  return NextResponse.redirect(new URL("/newsletter/unsubscribed", req.url));
}
