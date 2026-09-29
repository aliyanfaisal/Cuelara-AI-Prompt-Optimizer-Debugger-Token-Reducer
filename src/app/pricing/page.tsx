import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/blog";
import { getPaddleSettings } from "@/lib/paddle";
import { getSessionUser } from "@/lib/session-user";
import PricingPlans from "@/components/PricingPlans";

// Plans are edited in the admin, so the page reads them live.
export const dynamic = "force-dynamic";

const TITLE = "Pricing: Free and Paid Plans for Cuelara";
const DESCRIPTION = "Start free with all 9 Cuelara tools, then upgrade for higher daily limits when you need them. Compare the Free, Pro and Team plans.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: { type: "website", title: TITLE, description: DESCRIPTION, url: `${siteUrl()}/pricing` },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ reason?: string; message?: string }> }) {
  const { reason, message } = await searchParams;
  const quotaMessage = reason === "quota" ? message || "You've reached your daily limit for this tool." : null;

  const [plans, paddleSettings, sessionUser] = await Promise.all([
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthlyCents: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        priceMonthlyCents: true,
        priceYearlyCents: true,
        features: true,
        isFeatured: true,
        allowsOwnKeys: true,
        paddleMonthlyPriceIdSandbox: true,
        paddleMonthlyPriceIdProduction: true,
        paddleYearlyPriceIdSandbox: true,
        paddleYearlyPriceIdProduction: true,
      },
    }),
    getPaddleSettings(),
    getSessionUser(),
  ]);

  const user = sessionUser ? await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { id: true, email: true } }) : null;

  const base = siteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Cuelara",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    url: base,
    offers: plans.map((p) => ({
      "@type": "Offer",
      name: p.name,
      description: p.description ?? undefined,
      price: (p.priceMonthlyCents / 100).toFixed(2),
      priceCurrency: "USD",
      url: `${base}/pricing`,
    })),
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="relative w-full overflow-hidden px-6 pb-24 pt-32 md:pt-40">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-6xl">
          {quotaMessage && (
            <div className="mx-auto mb-8 flex max-w-2xl items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-900 dark:text-amber-200">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{quotaMessage} Upgrade below for higher daily limits.</span>
            </div>
          )}

          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h1 className="mb-4 text-4xl font-black tracking-tight text-foreground md:text-5xl">Simple, honest pricing</h1>
            <p className="text-lg text-muted-foreground">Start free with every tool. Upgrade when you need higher daily limits.</p>
            <p className="mt-3 text-sm text-muted-foreground">
              If you&apos;re unhappy with a paid plan, contact us within 7 days of your first payment for that plan and we&apos;ll issue a full refund, no questions asked.
            </p>
          </div>

          {plans.length === 0 ? (
            <p className="text-center text-muted-foreground">Plans are being set up. Check back soon, or <Link href="/contact" className="font-semibold text-primary hover:underline">contact us</Link>.</p>
          ) : (
            <PricingPlans plans={plans} paddleSettings={paddleSettings} user={user} />
          )}


        </div>
      </section>
    </div>
  );
}
