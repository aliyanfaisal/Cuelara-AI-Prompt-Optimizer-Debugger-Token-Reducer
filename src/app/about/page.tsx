import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, FileText, Gauge, Palette, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { siteUrl } from "@/lib/blog";

const TITLE = "About Cuelara";
const DESCRIPTION = "Cuelara builds practical tools that help you write better prompts, send fewer tokens and get more reliable results from ChatGPT, Claude and Gemini.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: { type: "website", title: `${TITLE} | Cuelara`, description: DESCRIPTION, url: `${siteUrl()}/about` },
  twitter: { card: "summary", title: `${TITLE} | Cuelara`, description: DESCRIPTION },
};

const OFFERINGS = [
  { icon: Sparkles, title: "Prompt tools", text: "Optimize, format, debug and score prompts so the model understands what you actually want." },
  { icon: FileText, title: "Context Extractor", text: "Pull only the relevant passages out of large documents, so you send fewer tokens and get fewer hallucinations." },
  { icon: Palette, title: "Site to Prompt", text: "Turn a website's measured design into a prompt an AI builder or image model can rebuild from." },
  { icon: Zap, title: "Token and cost tools", text: "Compress prompts, compare versions and see what a change is worth in real tokens and API cost." },
  { icon: BookOpen, title: "Prompt Cookbook", text: "A growing library of prompt templates, each with a worked example, best practices and common mistakes." },
];

const PRINCIPLES = [
  { icon: Gauge, title: "Measured, not guessed", text: "Where we can, we count real tokens and measure real pages instead of estimating." },
  { icon: ShieldCheck, title: "Respect for your data", text: "We don't save the prompts you run through the tools, and uploaded documents are removed within about a day." },
  { icon: Zap, title: "Useful and free to start", text: "Every tool is available on the free plan. Paid plans raise limits; they don't hide the basics." },
];

export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: TITLE,
    description: DESCRIPTION,
    url: `${siteUrl()}/about`,
    isPartOf: { "@type": "WebSite", name: "Cuelara", url: siteUrl() },
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="relative w-full overflow-hidden px-6 pb-16 pt-32 md:pt-40">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-black tracking-tight text-foreground md:text-6xl">
            Better prompts. <span className="text-gradient-primary">Fewer tokens.</span>
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
            Cuelara is a set of practical tools for people who work with AI every day. We help you say what you mean, send only what matters, and get results you can rely on from ChatGPT, Claude and Gemini.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Why we built it</h2>
        <div className="space-y-4 leading-relaxed text-foreground/90">
          <p>
            Most disappointing AI output starts with the input: a vague instruction, a wall of unstructured text, or a 200-page PDF pasted in whole. The fix is rarely a bigger model. It is a clearer prompt and better context.
          </p>
          <p>
            That is what Cuelara is for. It takes rough ideas and turns them into structured prompts, trims documents down to the passages that answer your question, and captures a website&apos;s design as a prompt an AI can rebuild from. Along the way it shows you what each change costs in tokens.
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-muted/10 px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">What you&apos;ll find here</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {OFFERINGS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">How we work</h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {PRINCIPLES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-foreground">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-3xl rounded-3xl border border-primary/20 bg-primary/5 p-10 text-center">
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Try it, then tell us what&apos;s missing</h2>
          <p className="mb-8 text-muted-foreground">Cuelara is still growing, and your feedback shapes what we build next.</p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/tools" className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90">
              Explore the tools <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link href="/contact" className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-background px-8 text-sm font-medium text-foreground transition-colors hover:bg-muted">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
