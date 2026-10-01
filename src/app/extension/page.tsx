import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Code2, Globe, LayoutList, MousePointerClick, Palette, Puzzle, ShieldCheck, Terminal, WandSparkles, Zap } from "lucide-react";
import { siteUrl } from "@/lib/blog";
import { ExtensionInstallSection } from "@/components/extension/ExtensionInstallSection";

const TITLE = "Cuelara Browser Extension";
const DESCRIPTION =
  "Optimize, build, compress, format and debug prompts right inside ChatGPT, Claude, Gemini and other AI chat boxes, and turn any website into a design prompt.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/extension" },
  openGraph: { type: "website", title: `${TITLE} | Cuelara`, description: DESCRIPTION, url: `${siteUrl()}/extension` },
};

const TOOLS = [
  { name: "Optimize", icon: Code2, color: "text-primary", text: "Turn a rough request into a complete, structured prompt." },
  { name: "Build", icon: WandSparkles, color: "text-orange-500", text: "Write a ready-to-paste prompt from a short idea." },
  { name: "Compress", icon: Zap, color: "text-amber-500", text: "Cut tokens from a wordy prompt without losing meaning." },
  { name: "Format", icon: LayoutList, color: "text-sky-500", text: "Reorganize a messy prompt into clean sections." },
  { name: "Debug", icon: ShieldCheck, color: "text-rose-500", text: "Find the gaps that make an AI fail, and fix them." },
  { name: "Site to Prompt", icon: Palette, color: "text-fuchsia-500", text: "Measure any site's design and turn it into a prompt." },
];

const STEPS = [
  { icon: MousePointerClick, title: "Click into a chat box", text: "A small Cuelara button appears on the AI sites you already use." },
  { icon: Terminal, title: "Pick a tool", text: "Choose Optimize, Build, Compress, Format or Debug from the menu." },
  { icon: Puzzle, title: "Your prompt is replaced", text: "The improved version fills the box for you. Undo is one click away." },
];

const FACTS = [
  { q: "When is my text sent, and where does it go?", a: "Only when you pick a tool from the menu, and the first time the extension asks you to confirm. The text in that one box goes to Cuelara, which passes it to AI providers (such as Google, OpenAI, Anthropic, xAI, Groq and OpenRouter) to write the result. Results from the extension are not saved to your history. Cuelara never reads or sends what you type in the background, and it ignores password, payment and search fields." },
  { q: "What does Site to Prompt read?", a: "Only when you press Analyse: the page’s colors, fonts, sizes and spacing, its title and a few headings. It never reads form fields, cookies or your browsing history. For a site you open from cuelara.com, the extension asks your permission first and drops that access when the analysis ends." },
  { q: "Does it see my password?", a: "No. Connecting an account happens on cuelara.com. The extension receives a separate access token that only works for Cuelara’s tools, and you can disconnect any browser from your dashboard." },
  { q: "Which sites does it run on?", a: "It starts on about 50 popular AI tools. On any other site it stays off until you click the Cuelara icon, and you can choose to always allow a site." },
  { q: "Can I turn it off for a site?", a: "Yes. Use “Don’t show on this site” in the menu, or the switch in the popup. Blocking a domain also blocks its subdomains, and the choice follows your account to every browser you connect." },
  { q: "Do I need an account?", a: "No. You get the free daily limits without one. Connect your account to use your plan’s limits and see your usage in the popup." },
];

export default function ExtensionPage() {
  return (
    <article className="container mx-auto max-w-4xl px-4 py-24 md:py-32">
      <header className="mb-10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-1 text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400">
          <Puzzle className="h-3.5 w-3.5" /> Browser extension
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">Cuelara, inside every AI chat box</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{DESCRIPTION}</p>
      </header>

      <section aria-labelledby="install" className="mb-14 rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
        <h2 id="install" className="mb-5 text-lg font-bold text-foreground">Get the extension</h2>
        <ExtensionInstallSection />
      </section>

      <section aria-labelledby="how" className="mb-14">
        <h2 id="how" className="mb-5 text-lg font-bold text-foreground">How it works</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-fuchsia-500/10 text-xs font-black text-fuchsia-600 dark:text-fuchsia-400">{i + 1}</span>
                <step.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="tools" className="mb-14">
        <h2 id="tools" className="mb-5 text-lg font-bold text-foreground">What’s inside</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {TOOLS.map((tool) => (
            <div key={tool.name} className="rounded-2xl border border-border bg-card p-5">
              <tool.icon className={`mb-3 h-5 w-5 ${tool.color}`} />
              <h3 className="text-sm font-bold text-foreground">{tool.name}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tool.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="privacy" className="mb-10">
        <h2 id="privacy" className="mb-5 flex items-center gap-2 text-lg font-bold text-foreground">
          <Globe className="h-4 w-4 text-muted-foreground" /> Privacy and control
        </h2>
        <dl className="space-y-3">
          {FACTS.map((fact) => (
            <div key={fact.q} className="rounded-2xl border border-border bg-card p-5">
              <dt className="text-sm font-bold text-foreground">{fact.q}</dt>
              <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{fact.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <Link href="/privacy" className="font-semibold text-primary hover:underline">Privacy policy</Link>
        <Link href="/tools" className="font-semibold text-primary hover:underline">Try the tools on the web</Link>
        <Link href="/docs/api" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"><BookOpen className="h-3.5 w-3.5" /> REST API</Link>
      </p>
    </article>
  );
}
