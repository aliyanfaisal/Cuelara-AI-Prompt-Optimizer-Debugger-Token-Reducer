import { NextResponse } from "next/server";
import { CONTACT_MAX_PER_HOUR, contactPayloadSchema } from "@/lib/contact";
import { sendContactNotificationEmail, sendContactReceiptEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { hitAbuseLimit, ipFromHeaders } from "@/lib/abuse-limit";
import { reportError } from "@/lib/error-report";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 32 * 1024;

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return NextResponse.json({ error: "Message is too large." }, { status: 413 });

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Malformed request." }, { status: 400 });
    }

    const parsed = contactPayloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 422 });
    }
    const { website, plan, subject, ...data } = parsed.data;

    // Bots fill the hidden field: pretend it worked and store nothing.
    if (website) return NextResponse.json({ success: true });

    // Per IP as well as per email below — rotating addresses would otherwise sidestep the email limit.
    const ipLimit = await hitAbuseLimit({ scope: "contact-ip", subject: ipFromHeaders((name) => req.headers.get(name)), limit: 8, windowSeconds: 60 * 60 });
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: "You've sent several messages already. Please wait a bit before sending another." }, { status: 429 });
    }

    const email = data.email.toLowerCase();
    const recent = await prisma.contactMessage.count({
      where: { email, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recent >= CONTACT_MAX_PER_HOUR) {
      return NextResponse.json({ error: "You've sent several messages already. Please wait a bit before sending another." }, { status: 429 });
    }

    // Stored first: the message is safe in the database even if SMTP is down.
    const saved = await prisma.contactMessage.create({
      data: { ...data, email, subject: subject || null, plan: plan || null },
    });

    const mail = { ...data, email, subject: subject || null, plan: plan || null };
    const [notified] = await Promise.allSettled([sendContactNotificationEmail(mail), sendContactReceiptEmail(mail)]);
    if (notified.status === "fulfilled") {
      await prisma.contactMessage.update({ where: { id: saved.id }, data: { emailSent: true } });
    } else {
      // sendEmail already logged the failure to EmailLog; the message itself is still in the admin inbox.
      console.error("Contact notification email failed:", notified.reason);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    void reportError(error, { source: "api", route: "/api/contact" });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
