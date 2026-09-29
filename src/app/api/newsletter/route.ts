import { NextResponse } from "next/server";
import { NEWSLETTER_MAX_PER_HOUR, newsletterPayloadSchema } from "@/lib/newsletter";
import { sendNewsletterWelcomeEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { hitAbuseLimit, ipFromHeaders } from "@/lib/abuse-limit";
import { reportError } from "@/lib/error-report";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 4 * 1024;

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return NextResponse.json({ error: "Request is too large." }, { status: 413 });

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Malformed request." }, { status: 400 });
    }

    const parsed = newsletterPayloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 422 });
    }
    const { website, source } = parsed.data;

    // Bots fill the hidden field: pretend it worked and store nothing.
    if (website) return NextResponse.json({ success: true });

    const ip = ipFromHeaders((name) => req.headers.get(name));
    const ipLimit = await hitAbuseLimit({ scope: "newsletter-ip", subject: ip, limit: 10, windowSeconds: 60 * 60 });
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    const email = parsed.data.email.toLowerCase();
    const emailLimit = await hitAbuseLimit({ scope: "newsletter-email", subject: email, limit: NEWSLETTER_MAX_PER_HOUR, windowSeconds: 60 * 60 });
    if (!emailLimit.allowed) {
      return NextResponse.json({ error: "Please try again later." }, { status: 429 });
    }

    // Upsert: a returning or previously-unsubscribed address is simply re-activated.
    const subscriber = await prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email, source: source || "footer" },
      update: { unsubscribedAt: null, source: source || "footer" },
    });

    try {
      await sendNewsletterWelcomeEmail({ email, subscriberId: subscriber.id });
    } catch (error) {
      // The subscription itself is saved even if the welcome email fails to send.
      console.error("Newsletter welcome email failed:", error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Newsletter signup error:", error);
    void reportError(error, { source: "api", route: "/api/newsletter" });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
