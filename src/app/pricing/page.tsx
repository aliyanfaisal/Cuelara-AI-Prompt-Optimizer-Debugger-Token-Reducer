import type { Metadata } from "next";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/blog";
import { formatPlanPrice, planFeatures } from "@/lib/pricing";

// Plans are edited in the admin, so the page reads them live.
export const dynamic = "force-dynamic";

const TITLE = "Pricing: Free and Paid Plans for Cuelara";
const DESCRIPTION = "Start free with all 8 Cuelara tools, then upgrade for higher daily limits when you need them. Compare the Free, Pro and Team plans.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: { type: "website", title: TITLE, description: DESCRIPTION, url: `${siteUrl()}/pricing` },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default async function PricingPage() {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { priceMonthlyCents: "asc" },
    select: { id: true, name: true, slug: true, description: true, priceMonthlyCents: true, features: true, isFeatured: true, allowsOwnKeys: true },
  });

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
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h1 className="mb-4 text-4xl font-black tracking-tight text-foreground md:text-5xl">Simple, honest pricing</h1>
            <p className="text-lg text-muted-foreground">Start free with every tool. Upgrade when you need higher daily limits.</p>
          </div>

          {plans.length === 0 ? (
            <p className="text-center text-muted-foreground">Plans are being set up. Check back soon, or <Link href="/contact" className="font-semibold text-primary hover:underline">contact us</Link>.</p>
          ) : (
            <div className={`mx-auto grid grid-cols-1 gap-6 ${plans.length >= 3 ? "lg:grid-cols-3" : "max-w-3xl md:grid-cols-2"}`}>
              {plans.map((plan) => {
                const price = formatPlanPrice(plan.priceMonthlyCents);
                const isFree = plan.priceMonthlyCents === 0;
                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-3xl border bg-card p-8 shadow-sm ${
                      plan.isFeatured ? "border-primary shadow-xl shadow-primary/10 lg:-translate-y-2" : "border-border/60"
                    }`}
                  >
                    {plan.isFeatured && (
                      <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                        <Sparkles className="h-3 w-3" /> Most popular
                      </span>
                    )}

                    <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                    {plan.description && <p className="mt-1 min-h-10 text-sm text-muted-foreground">{plan.description}</p>}

                    <p className="mt-6 flex items-baseline gap-1">
                      <span className="text-5xl font-black tracking-tight text-foreground">{price.amount}</span>
                      {price.period && <span className="text-sm font-medium text-muted-foreground">{price.period}</span>}
                    </p>

                    <Link
                      href={plan.allowsOwnKeys ? "/dashboard/models" : isFree ? "/register" : `/contact?plan=${plan.slug}`}
                      className={`mt-8 inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-bold transition-colors ${
                        plan.isFeatured ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      {plan.allowsOwnKeys ? "Add your own keys" : isFree ? "Get started free" : "Contact us"}
                    </Link>

                    <ul className="mt-8 space-y-3 border-t border-border pt-8 text-sm text-foreground/90">
                      {planFeatures(plan.features).map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-12 text-center text-sm text-muted-foreground">
            Paid plans are set up by our team for now: <Link href="/contact" className="font-semibold text-primary hover:underline">contact us</Link> and we&apos;ll get you started.
          </p>
        </div>
      </section>
    </div>
  );
}
