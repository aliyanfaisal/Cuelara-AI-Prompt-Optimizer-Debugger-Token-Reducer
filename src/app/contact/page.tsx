import type { Metadata } from "next";
import { Clock, Mail } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/blog";
import { ContactForm } from "./ContactForm";

export const dynamic = "force-dynamic";

const TITLE = "Contact Cuelara";
const DESCRIPTION = "Questions about Cuelara, our plans or the tools? Send us a message and we'll reply by email.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/contact" },
  openGraph: { type: "website", title: TITLE, description: DESCRIPTION, url: `${siteUrl()}/contact` },
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan: slug } = await searchParams;
  const plan = slug ? await prisma.plan.findFirst({ where: { slug, isActive: true }, select: { slug: true, name: true } }) : null;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <section className="relative w-full overflow-hidden px-6 pb-24 pt-32 md:pt-40">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Mail className="h-7 w-7" />
            </div>
            <h1 className="mb-4 text-4xl font-black tracking-tight text-foreground md:text-5xl">Get in touch</h1>
            <p className="text-lg text-muted-foreground">Questions about Cuelara, our plans or the tools? Send us a message and we&apos;ll reply by email.</p>
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> We usually reply within one to two business days.
            </p>
          </div>

          <ContactForm plan={plan?.slug} planName={plan?.name} />
        </div>
      </section>
    </div>
  );
}
