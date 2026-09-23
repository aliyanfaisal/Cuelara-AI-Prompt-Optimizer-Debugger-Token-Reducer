"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Palette, Globe, Puzzle, RefreshCcw, AlertTriangle, Copy, Check, Download,
  Wand2, ChevronDown, Code2, Terminal, BookOpen,
} from "lucide-react";
import { TARGETS, type Target } from "@/lib/site-to-prompt/constants";
import { pingExtension, analyseWithExtension, takePendingAnalysis } from "@/lib/site-to-prompt/extension-bridge";
import type { DesignDna } from "@/lib/site-to-prompt/types";
import { PromptOutputViewer, PromptViewToggle, type PromptViewMode } from "@/components/tools/PromptOutputViewer";

const EXTENSION_URL = process.env.NEXT_PUBLIC_EXTENSION_URL || "";
type Stage = "idle" | "analysing" | "analysed" | "generating" | "done";

interface Usage {
  isAuthenticated: boolean;
  analysesRemaining: number;
  analysesLimit: number;
  promptsRemaining: number;
  promptsLimit: number;
}

const FAQS = [
  {
    question: "Why do I need a browser extension?",
    answer: "Websites can't read each other's styling — browsers block it for security. The Cuelara extension opens the site in a background tab of your own browser, measures its computed styles (colors, fonts, spacing, radii), and closes the tab. Because it runs in your browser, it also works on pages you're logged in to.",
  },
  {
    question: "Can I analyse a site without typing its URL?",
    answer: "Yes. Open any website, click the Cuelara icon in your browser toolbar, and this page opens with that site's design already measured.",
  },
  {
    question: "What does the extension send to Cuelara?",
    answer: "Only style measurements: colors, font names and sizes, spacing, radii, shadows, and the page title and a few heading texts used to describe the layout. It doesn't read form fields, cookies, or page content beyond that, and it only acts when you press Analyse on this page.",
  },
  {
    question: "How does it read a site's design without AI?",
    answer: "The extension asks the browser for the computed style of every visible element — the exact colors, font sizes, paddings and radii it painted. Those numbers are counted and ranked (the most-used large background is the page background, the saturated color on buttons is the accent). AI is only used at the end, to phrase the measured tokens as a prompt for your chosen tool.",
  },
  {
    question: "Which target should I pick?",
    answer: "Choose UI Builder for v0, Bolt or Lovable — you get a sectioned build spec. Choose Code Assistant for Claude or ChatGPT — you get CSS variables plus guidance. Choose an image generator to get a single descriptive prompt for Midjourney or FLUX.",
  },
  {
    question: "Can I tweak the colors and fonts first?",
    answer: "Yes. The Design DNA card is editable — change the core colors or fonts before generating and the prompt uses your values.",
  },
];

function isHex(v: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(v);
}

function ColorField({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string) => void }) {
  if (value === null) return null;
  return (
    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-background">
      <input
        type="color"
        value={isHex(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="w-8 h-8 rounded-md border border-border bg-transparent cursor-pointer p-0"
        aria-label={`${label} colour`}
      />
      <span className="flex flex-col text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold text-foreground">{value}</span>
      </span>
    </label>
  );
}

export default function SiteToPromptPage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [extVersion, setExtVersion] = useState<string | null>(null);
  const [extChecked, setExtChecked] = useState(false);
  const [url, setUrl] = useState("");
  const [dna, setDna] = useState<DesignDna | null>(null);
  const [target, setTarget] = useState<Target>(TARGETS[0]);
  const [isTargetOpen, setIsTargetOpen] = useState(false);
  const [goal, setGoal] = useState("");
  const [prompt, setPrompt] = useState("");
  const [viewMode, setViewMode] = useState<PromptViewMode>("rendered");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const pendingChecked = useRef(false);
  const dnaRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/tools/site-to-prompt/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && typeof d.analysesLimit === "number" && setUsage(d))
      .catch(() => {});
  }, []);

  // Detect the extension on load, and keep checking while it's missing so the page unlocks as soon as it's installed.
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const v = await pingExtension();
      if (cancelled) return;
      setExtVersion(v);
      setExtChecked(true);
    };
    check();
    const interval = setInterval(() => {
      if (!extVersion) check();
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [extVersion]);

  useEffect(() => {
    if (stage === "analysed") setTimeout(() => dnaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    if (stage === "done") setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, [stage]);

  const canAnalyse = url.trim().length > 0 && !!extVersion;

  /** Sends measurements to the server to build the Design DNA. Shared by the URL form and the toolbar-click handoff. */
  const submitMeasurements = async (raw: unknown, target: string) => {
    try {
      const res = await fetch("/api/tools/site-to-prompt/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw, url: target }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setStage(dna ? "analysed" : "idle");
        return;
      }
      setDna(data.dna);
      setUsage((u) => ({
        isAuthenticated: !!data.isAuthenticated,
        analysesRemaining: data.analysesRemaining,
        analysesLimit: data.analysesLimit,
        promptsRemaining: u?.promptsRemaining ?? 0,
        promptsLimit: u?.promptsLimit ?? 0,
      }));
      setStage("analysed");
    } catch {
      setError("Network error — please check your connection and try again.");
      setStage(dna ? "analysed" : "idle");
    }
  };

  const handleAnalyse = async () => {
    if (!canAnalyse || stage === "analysing") return;
    setStage("analysing");
    setError(null);
    setPrompt("");
    const target = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    const measured = await analyseWithExtension(target);
    if (!measured.ok) {
      setError(measured.error);
      setStage(dna ? "analysed" : "idle");
      return;
    }
    await submitMeasurements(measured.raw, target);
  };

  // A page analysed from the toolbar icon on another site arrives here once, right after the tool page opens.
  useEffect(() => {
    if (!extVersion || pendingChecked.current) return;
    pendingChecked.current = true;
    (async () => {
      const pending = await takePendingAnalysis();
      if (!pending) return;
      if (!pending.ok || !pending.raw) {
        setError(pending.error || "Couldn't read that page.");
        return;
      }
      setUrl(pending.url ?? "");
      setStage("analysing");
      await submitMeasurements(pending.raw, pending.url ?? "");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extVersion]);

  const handleGenerate = async () => {
    if (!dna || stage === "generating") return;
    setStage("generating");
    setError(null);
    try {
      const res = await fetch("/api/tools/site-to-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dna, target, goal }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setStage("analysed");
        return;
      }
      setPrompt(data.prompt);
      setUsage((u) => (u ? { ...u, promptsRemaining: data.promptsRemaining, promptsLimit: data.promptsLimit } : u));
      setStage("done");
    } catch {
      setError("Network error — please check your connection and try again.");
      setStage("analysed");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([prompt], { type: "text/markdown" }));
    a.download = "site-prompt.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const setColor = (key: "background" | "surface" | "text" | "mutedText" | "accent", v: string) =>
    setDna((d) => (d ? { ...d, colors: { ...d.colors, [key]: v } } : d));

  const busy = stage === "analysing" || stage === "generating";

  return (
    <article className="flex flex-col w-full py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-500 rounded-xl shrink-0 shadow-sm">
            <Palette className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Site to Prompt</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Paste a website and get a prompt that recreates its look. We measure the real colors, fonts, spacing and layout from the rendered page — then write the prompt for v0, Bolt, Claude, ChatGPT, Midjourney or FLUX.
        </p>
      </motion.div>

      {/* Step 1: input (or install prompt) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden flex flex-col mb-8">
        {!extVersion ? (
          <div className="p-6 md:p-8 flex flex-col items-start gap-4">
            <div className="p-2.5 bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-500 rounded-xl">
              <Puzzle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {extChecked ? "Install the Cuelara extension to continue" : "Checking for the Cuelara extension..."}
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed max-w-xl">
                Browsers don&apos;t let one website read another&apos;s styling, so Site to Prompt measures pages from a small extension running in your own browser. It only acts when you press Analyse here, and it works on logged-in pages too.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {EXTENSION_URL && (
                <a href={EXTENSION_URL} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-semibold shadow-sm">
                  <Puzzle className="w-3.5 h-3.5" /> Add to Chrome
                </a>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <RefreshCcw className="w-3 h-3 animate-spin" /> This page unlocks automatically once the extension is installed.
              </span>
            </div>
            {extChecked && !EXTENSION_URL && (
              <p className="text-xs text-muted-foreground">The extension is being prepared for the Chrome Web Store — check back soon.</p>
            )}
          </div>
        ) : (
          <>
            <div className="p-5 md:p-6 flex items-center gap-3">
              <Globe className="w-4 h-4 text-fuchsia-500 shrink-0" />
              <input
                type="text" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyse()}
                placeholder="https://stripe.com"
                aria-label="Website URL"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/45 border-none focus:ring-0 p-0 focus-visible:outline-none"
              />
            </div>

            <div className="px-5 md:px-6 py-4 border-t border-border bg-muted/10 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                {usage && usage.analysesLimit > 0 && (
                  <span>
                    <strong className="text-foreground">{usage.analysesRemaining}</strong> / {usage.analysesLimit} site analyses left today
                    {!usage.isAuthenticated && <> — <Link href="/login" className="text-primary hover:underline">sign in for more</Link></>}
                  </span>
                )}
              </div>
              <button onClick={handleAnalyse} disabled={!canAnalyse || busy || usage?.analysesRemaining === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                {stage === "analysing" ? <><RefreshCcw className="w-3.5 h-3.5 animate-spin" /> Measuring the page...</> : <><Palette className="w-3.5 h-3.5" /> Analyse Design</>}
              </button>
            </div>
          </>
        )}
      </motion.div>

      {error && (
        <div className="mb-8 bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 flex items-center gap-3 text-sm text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-4 h-4 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {/* Step 2: Design DNA */}
      <div ref={dnaRef} className="scroll-mt-24">
        <AnimatePresence>
          {dna && stage !== "analysing" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl shadow-sm mb-8 overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-muted/20">
                <h2 className="text-sm font-bold text-foreground">Design DNA</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Measured from {dna.source.url ?? "the page"} · {dna.mode} theme. Edit anything before generating.
                </p>
              </div>

              <div className="p-5 md:p-6 space-y-6">
                <section>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Colors</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                    <ColorField label="Background" value={dna.colors.background} onChange={(v) => setColor("background", v)} />
                    <ColorField label="Surface" value={dna.colors.surface} onChange={(v) => setColor("surface", v)} />
                    <ColorField label="Text" value={dna.colors.text} onChange={(v) => setColor("text", v)} />
                    <ColorField label="Muted text" value={dna.colors.mutedText} onChange={(v) => setColor("mutedText", v)} />
                    <ColorField label="Accent" value={dna.colors.accent} onChange={(v) => setColor("accent", v)} />
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden mt-4 border border-border" aria-label="Palette by usage">
                    {dna.colors.palette.map((c) => (
                      <div key={c.hex} title={`${c.hex} · ${Math.round(c.share * 100)}%`} style={{ background: c.hex, flexGrow: Math.max(c.share, 0.02) }} />
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Typography</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                    {(["headingFont", "bodyFont"] as const).map((k) => (
                      <label key={k} className="flex flex-col gap-1 text-xs p-2.5 rounded-xl border border-border bg-background">
                        <span className="text-muted-foreground">{k === "headingFont" ? "Heading font" : "Body font"}</span>
                        <input value={dna.typography[k]} maxLength={100}
                          onChange={(e) => setDna({ ...dna, typography: { ...dna.typography, [k]: e.target.value } })}
                          className="bg-transparent font-semibold text-foreground focus-visible:outline-none" />
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {dna.typography.scale.map((s) => (
                      <span key={s.role} className="px-2.5 py-1.5 rounded-lg border border-border bg-muted/30">
                        <strong className="text-foreground uppercase">{s.role}</strong>{" "}
                        <span className="text-muted-foreground">{s.size}px · {s.weight}{s.lineHeight ? ` · lh ${s.lineHeight}` : ""}</span>
                      </span>
                    ))}
                  </div>
                </section>

                <section className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs">
                  <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Spacing & shape</h3>
                    <p className="text-foreground">
                      {dna.spacing.baseUnit ? `${dna.spacing.baseUnit}px base unit` : "No consistent base unit"}
                      {dna.spacing.scale.length > 0 && <span className="text-muted-foreground"> · {dna.spacing.scale.join(", ")}px</span>}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Radii: {dna.radii.common.length ? dna.radii.common.map((r) => `${r}px`).join(", ") : "none"}
                      {dna.radii.button !== null && ` · buttons ${dna.radii.button}px`}
                      {dna.radii.card !== null && ` · cards ${dna.radii.card}px`}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Layout & effects</h3>
                    <p className="text-foreground">
                      {[dna.layout.usesGrid && "CSS grid", dna.layout.usesFlex && "flexbox"].filter(Boolean).join(" + ") || "Block layout"}
                      {dna.layout.containerWidth && <span className="text-muted-foreground"> · {dna.layout.containerWidth}px container</span>}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      {dna.layout.sections.length} top-level sections
                      {dna.shadows.length > 0 && ` · ${dna.shadows.length} shadow style${dna.shadows.length > 1 ? "s" : ""}`}
                      {dna.effects.backdropBlur && " · backdrop blur"}
                      {dna.effects.gradients.length > 0 && " · gradients"}
                    </p>
                  </div>
                </section>
              </div>

              {/* Step 3: target + goal */}
              <div className="px-5 md:px-6 py-5 border-t border-border bg-muted/10 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <button onClick={() => setIsTargetOpen(!isTargetOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted shadow-sm cursor-pointer">
                      Target: <span className="text-foreground font-semibold">{target}</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                    </button>
                    {isTargetOpen && (
                      <div className="absolute top-full left-0 mt-1 w-72 bg-card border border-border rounded-xl shadow-xl z-30 py-1">
                        {TARGETS.map((t) => (
                          <button key={t} onClick={() => { setTarget(t); setIsTargetOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center justify-between cursor-pointer ${target === t ? "text-fuchsia-500 font-bold bg-fuchsia-500/5" : "text-foreground"}`}>
                            <span>{t}</span>{target === t && <Check className="w-3 h-3" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <input value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={400}
                  placeholder="Optional: what are you building? e.g. a landing page for a dog-walking app"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-fuchsia-500/50" />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {usage && usage.promptsLimit > 0 && <><strong className="text-foreground">{usage.promptsRemaining}</strong> / {usage.promptsLimit} prompts left today</>}
                  </span>
                  <button onClick={handleGenerate} disabled={busy || usage?.promptsRemaining === 0}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                    {stage === "generating" ? <><RefreshCcw className="w-3.5 h-3.5 animate-spin" /> Writing prompt...</> : <><Wand2 className="w-3.5 h-3.5" /> Generate Prompt</>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Output */}
      <div ref={outputRef} className="scroll-mt-24 mb-16">
        {stage === "done" && prompt && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-4">
              <span className="text-sm font-bold text-foreground">Your Prompt <span className="text-xs text-muted-foreground font-normal ml-1">({target})</span></span>
              <div className="flex items-center gap-2">
                <PromptViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                <button onClick={handleCopy} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer">
                  {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Prompt</>}
                </button>
                <button onClick={handleDownload} className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer" title="Download as .md">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            <PromptOutputViewer content={prompt} viewMode={viewMode} onViewModeChange={setViewMode} accentColor="primary" language="markdown" />
          </motion.div>
        )}
      </div>

      {/* FAQ + related */}
      <section className="border-t border-border pt-12 space-y-10 text-foreground">
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => {
              const open = openFaq === i;
              return (
                <div key={faq.question} className="rounded-xl border border-border bg-card overflow-hidden">
                  <button onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full p-4 flex items-center justify-between text-left text-xs sm:text-sm font-semibold hover:text-fuchsia-600 dark:hover:text-fuchsia-400 transition-colors cursor-pointer">
                    <span>{faq.question}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ml-2 ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3">{faq.answer}</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-muted/20 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider">Explore Related Prompt Engineering Tools</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {[
              { href: "/tools/prompt-optimizer", label: "Prompt Optimizer", Icon: Code2 },
              { href: "/tools/prompt-formatter", label: "Prompt Formatter", Icon: Terminal },
              { href: "/cookbook", label: "Prompt Cookbook", Icon: BookOpen },
            ].map(({ href, label, Icon }) => (
              <Link key={href} href={href} className="p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:text-primary transition-all flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary" /> <span className="font-semibold">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </article>
  );
}
