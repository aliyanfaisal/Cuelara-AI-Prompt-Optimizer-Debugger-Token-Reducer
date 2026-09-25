"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  WandSparkles, Copy, Check, ChevronDown, Settings2, RefreshCcw, Download, AlertTriangle,
  Lightbulb, FileText, Code2, ShieldCheck, Sparkles, Terminal, BookOpen, ListChecks, Target, Scissors,
} from "lucide-react";
import {
  BUILDER_TARGETS, BUILDER_USE_CASES, BUILDER_DETAIL_LEVELS, MAX_IDEA_CHARS,
  type BuilderTarget, type BuilderUseCase, type BuilderDetail,
} from "@/lib/prompt-builder/constants";
import { PromptOutputViewer, PromptViewToggle, type PromptViewMode } from "@/components/tools/PromptOutputViewer";
import { TimedProgress, type ProgressStep } from "@/components/tools/TimedProgress";
import { SaveToWorkspaceButton } from "@/components/tools/SaveToWorkspaceButton";
import { useSavedRun, SavedRunBanner } from "@/components/tools/useSavedRun";

type GenerationState = "idle" | "loading" | "success";

// Paced to a typical ~10s generation call.
const LOADING_STEPS: ProgressStep[] = [
  { label: "Reading your idea and working out the real goal...", seconds: 3 },
  { label: "Choosing the sections this task actually needs...", seconds: 3 },
  { label: "Writing the prompt for your target model...", seconds: 4 },
  { label: "Trimming anything that doesn't earn its place...", seconds: 3 },
];

const EXAMPLES = [
  "Review my pull request for bugs and unclear naming",
  "A cold email to a startup founder about my design services",
  "Explain how vector databases work to a beginner",
  "Weekly plan for a small team's product launch",
];

const FAQS = [
  {
    question: "What is a prompt builder?",
    answer: "A prompt builder turns a rough idea (\"help me write a launch email\") into a complete prompt an AI model can act on well: a clear task, the context that matters, sensible constraints and an output format. You describe the goal; it does the prompt engineering.",
  },
  {
    question: "Will it add details I didn't ask for?",
    answer: "No. Prompt Builder keeps your intent and never invents requirements, audiences or technologies. When a detail is missing but would change the result, it leaves a short [PLACEHOLDER] for you to fill in instead of guessing.",
  },
  {
    question: "Why choose a target model?",
    answer: "Models respond best to different structures. Claude follows XML-tagged sections closely, ChatGPT and Gemini work well with Markdown sections, and coding editors like Cursor need scope and acceptance criteria. Picking a target formats the prompt the way that model reads best.",
  },
  {
    question: "How is this different from the Prompt Optimizer?",
    answer: "Prompt Builder starts from an idea and writes a prompt from scratch. Prompt Optimizer starts from a prompt you already wrote and improves it. Use the Builder first, then the Optimizer, Debugger or Intelligence Score if you want to refine or check the result.",
  },
];

interface BuilderUsage {
  isAuthenticated: boolean;
  promptsRemaining: number;
  promptsLimit: number;
}

function Dropdown<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted transition-all shadow-sm"
      >
        {label}: <span className="text-foreground font-semibold">{value}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-50" />
      </button>
      {open && (
        <div role="listbox" className="absolute top-full left-0 mt-1 min-w-44 bg-card border border-border rounded-xl shadow-xl z-30 py-1 overflow-hidden">
          {options.map((o) => (
            <button
              key={o}
              role="option"
              aria-selected={value === o}
              onClick={() => { onChange(o); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center justify-between ${
                value === o ? "text-orange-500 font-bold bg-orange-500/5" : "text-foreground"
              }`}
            >
              <span>{o}</span>
              {value === o && <Check className="w-3 h-3 text-orange-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PromptBuilderPage() {
  const [state, setState] = useState<GenerationState>("idle");
  const [idea, setIdea] = useState("");
  const [target, setTarget] = useState<BuilderTarget>(BUILDER_TARGETS[0]);
  const [useCase, setUseCase] = useState<BuilderUseCase>(BUILDER_USE_CASES[0]);
  const [detail, setDetail] = useState<BuilderDetail>(BUILDER_DETAIL_LEVELS[1]);

  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [built, setBuilt] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usage, setUsage] = useState<BuilderUsage | null>(null);
  // Holds the real result while TimedProgress finishes its own fill/hold animation — see onFinished below.
  const [pendingResult, setPendingResult] = useState<{ prompt: string; usage: BuilderUsage | null } | null>(null);
  const [viewMode, setViewMode] = useState<PromptViewMode>("rendered");

  const outputRef = useRef<HTMLDivElement>(null);

  const refreshUsage = async () => {
    try {
      const res = await fetch("/api/tools/prompt-builder/usage");
      if (res.ok) {
        const data = await res.json();
        if (typeof data.promptsLimit === "number") setUsage(data);
      }
    } catch {
      // Usage display is best-effort — a failed fetch just hides the pill.
    }
  };

  useEffect(() => {
    refreshUsage();
  }, []);

  useEffect(() => {
    if (state !== "idle" && outputRef.current) {
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }, [state]);

  const saved = useSavedRun<{ idea: string; target: string; useCase: string; detail: string }, { prompt: string }>("prompt-builder");
  useEffect(() => {
    const run = saved.run;
    if (!run) return;
    setIdea(run.input.idea);
    setTarget(BUILDER_TARGETS.find((t) => t === run.input.target) ?? BUILDER_TARGETS[0]);
    setUseCase(BUILDER_USE_CASES.find((u) => u === run.input.useCase) ?? BUILDER_USE_CASES[0]);
    setDetail(BUILDER_DETAIL_LEVELS.find((d) => d === run.input.detail) ?? BUILDER_DETAIL_LEVELS[1]);
    setBuilt(run.result.prompt);
    setState("success");
  }, [saved.run]);

  const handleBuild = async () => {
    if (!idea.trim() || state === "loading") return;

    setState("loading");
    setErrorMessage(null);
    setPendingResult(null);

    try {
      const res = await fetch("/api/tools/prompt-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, target, useCase, detail, historyId: saved.run?.id }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(data.error || "Something went wrong. Please try again.");
        setState("idle");
        return;
      }

      setPendingResult({
        prompt: typeof data.prompt === "string" ? data.prompt : "",
        usage:
          typeof data.promptsLimit === "number"
            ? { isAuthenticated: !!data.isAuthenticated, promptsRemaining: data.promptsRemaining, promptsLimit: data.promptsLimit }
            : null,
      });
    } catch {
      setErrorMessage("Network error — please check your connection and try again.");
      setState("idle");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(built);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    element.href = URL.createObjectURL(new Blob([built], { type: "text/plain" }));
    element.download = "built_prompt.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <article className="flex flex-col w-full py-8">
      {/* 1. Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-xl shrink-0 shadow-sm">
            <WandSparkles className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Prompt Builder</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Describe what you want in plain words. Get a complete, well-structured prompt for the AI model of your choice — clear, concise, and never padded with things you didn&rsquo;t ask for.
        </p>
      </motion.div>

      <SavedRunBanner saved={saved} tool="prompt-builder" />

      {/* 2. Studio Editor Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden flex flex-col mb-8 transition-shadow hover:shadow-md"
      >
        <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Settings2 className="w-4 h-4 text-orange-500" />
            Build Settings
          </div>
          <div className="h-4 w-px bg-border mx-1 hidden sm:block" />
          <Dropdown label="For" value={target} options={BUILDER_TARGETS} onChange={setTarget} />
          <Dropdown label="Use case" value={useCase} options={BUILDER_USE_CASES} onChange={setUseCase} />
          <Dropdown label="Detail" value={detail} options={BUILDER_DETAIL_LEVELS} onChange={setDetail} />
        </div>

        <div className="relative p-5 md:p-6">
          <label htmlFor="idea" className="sr-only">Your idea</label>
          <textarea
            id="idea"
            value={idea}
            onChange={(e) => setIdea(e.target.value.slice(0, MAX_IDEA_CHARS))}
            placeholder="What do you want the AI to do? A sentence is enough — e.g. “Help me write a launch announcement for my new app.”"
            className="w-full min-h-[160px] bg-transparent resize-y text-sm text-foreground placeholder:text-muted-foreground/45 dark:placeholder:text-muted-foreground/35 border-none focus:ring-0 p-0 leading-relaxed focus-visible:outline-none"
          />
          {!idea.trim() && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lightbulb className="w-3.5 h-3.5 text-orange-500" /> Try:</span>
              {EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => setIdea(ex)} className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:border-orange-500/40 hover:text-foreground transition-colors">
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 md:px-6 py-4 border-t border-border bg-muted/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span>{idea.length.toLocaleString()} / {MAX_IDEA_CHARS.toLocaleString()} characters</span>
            {usage && (
              <span>
                <strong className="text-foreground">{usage.promptsRemaining}</strong> / {usage.promptsLimit} prompts left today
                {!usage.isAuthenticated && (
                  <> — <Link href="/login" className="text-primary hover:underline">sign in for more</Link></>
                )}
              </span>
            )}
          </div>

          <button
            onClick={handleBuild}
            disabled={!idea.trim() || state === "loading" || usage?.promptsRemaining === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {state === "loading" ? (
              <>
                <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                Building Prompt...
              </>
            ) : (
              <>
                <WandSparkles className="w-3.5 h-3.5" />
                Build Prompt
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* 3. Output Section */}
      <div ref={outputRef} className="scroll-mt-24 mb-16">
        <AnimatePresence mode="wait">
          {state === "idle" && errorMessage && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="alert"
              className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 flex items-center gap-3 text-sm text-rose-600 dark:text-rose-400"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {state === "loading" && (
            <TimedProgress
              key="loading"
              accent="primary"
              icon={WandSparkles}
              steps={LOADING_STEPS}
              subtitle="Turning your idea into a clear, structured prompt..."
              slowHint="Still building — a busy free model queue can take a little longer."
              done={pendingResult !== null}
              onFinished={() => {
                if (!pendingResult) return;
                setBuilt(pendingResult.prompt);
                if (pendingResult.usage) setUsage(pendingResult.usage);
                setPendingResult(null);
                setState("success");
              }}
            />
          )}

          {state === "success" && (
            <motion.div key="success" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 text-sm font-bold text-foreground">
                    <div className="p-1.5 bg-orange-500/10 text-orange-500 rounded-lg">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <span>Your Prompt</span>
                      <span className="text-xs text-muted-foreground font-normal ml-2">({target} · {useCase} · {detail})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <PromptViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                    <SaveToWorkspaceButton content={built} title={idea} tool="prompt-builder" />
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm cursor-pointer"
                    >
                      {copied ? (<><Check className="w-3.5 h-3.5" />Copied!</>) : (<><Copy className="w-3.5 h-3.5" />Copy Prompt</>)}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Download as .txt"
                      aria-label="Download prompt as a text file"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <PromptOutputViewer content={built} viewMode={viewMode} onViewModeChange={setViewMode} accentColor="primary" language="markdown" />
              </div>

              {/^[\s\S]*\[[A-Z][A-Z0-9 _/-]{2,}\]/.test(built) && (
                <p className="flex items-start gap-2 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3 text-xs text-muted-foreground">
                  <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                  <span>Replace the <strong className="text-foreground">[BRACKETED]</strong> placeholders with your own details before you use the prompt — they mark things only you know.</span>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Next:</span>
                <Link href="/tools/prompt-debugger" className="hover:text-primary hover:underline">Check it for ambiguity</Link>
                <Link href="/tools/intelligence-score" className="hover:text-primary hover:underline">Score it</Link>
                <Link href="/tools/token-optimizer" className="hover:text-primary hover:underline">Shorten it</Link>
                <Link href="/tools/prompt-formatter" className="hover:text-primary hover:underline">Convert to XML or JSON</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Guide & SEO section */}
      <section className="border-t border-border pt-12 space-y-12 text-foreground">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-xs font-semibold">
            <WandSparkles className="w-3.5 h-3.5" />
            From Idea to Prompt
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Stop Staring at a Blank Prompt Box</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Most people know <em>what</em> they want from <strong>ChatGPT</strong>, <strong>Claude</strong> or <strong>Gemini</strong> but not how to phrase it. Vague requests get vague answers. <strong>Prompt Builder</strong> takes your rough idea and writes the prompt for you: the task, the context that matters, sensible constraints and the output format.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            It follows one rule: <strong>better, not longer</strong>. Your intent stays exactly as you stated it, nothing is invented, and details only you know are left as clear placeholders.
          </p>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold text-foreground">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Lightbulb, title: "1. Describe your idea", body: "A sentence or a few lines is enough. Say what you want the AI to do, not how to prompt it." },
              { icon: Target, title: "2. Pick the model", body: "Choose the AI you'll use, a use case and how detailed the prompt should be. The structure adapts to how that model reads best." },
              { icon: Scissors, title: "3. Copy a lean prompt", body: "Get a ready-to-paste prompt with no filler. Fill in any [placeholders], then run it — or refine it with the other tools." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="p-5 rounded-2xl bg-card border border-border space-y-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-sm text-foreground">{title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-foreground">Frequently Asked Questions</h3>
          <div className="space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={faq.question} className="rounded-xl border border-border bg-card overflow-hidden transition-all">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="w-full p-4 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-2 ${isOpen ? "rotate-180 text-orange-600 dark:text-orange-400" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3"
                      >
                        {faq.answer}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-muted/20 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Explore Related Prompt Engineering Tools</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[
              { href: "/tools/prompt-optimizer", label: "Prompt Optimizer", Icon: Code2, color: "text-primary" },
              { href: "/tools/prompt-debugger", label: "Prompt Debugger", Icon: ShieldCheck, color: "text-emerald-500" },
              { href: "/tools/intelligence-score", label: "Intelligence Score", Icon: Sparkles, color: "text-violet-500" },
              { href: "/tools/prompt-formatter", label: "Prompt Formatter", Icon: Terminal, color: "text-pink-500" },
              { href: "/cookbook", label: "Prompt Cookbook", Icon: BookOpen, color: "text-emerald-500" },
            ].map(({ href, label, Icon, color }) => (
              <Link key={href} href={href} className="p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:text-primary transition-all flex items-center gap-2 group">
                <Icon className={`w-4 h-4 ${color} group-hover:scale-110 transition-transform`} />
                <span className="font-semibold">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Prompt Builder",
              operatingSystem: "All",
              applicationCategory: "DeveloperApplication",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              description: "Turn a rough idea into a complete, well-structured AI prompt for ChatGPT, Claude, Gemini, Cursor and more.",
              featureList: [
                "Idea-to-prompt generation",
                "Model-specific structure (Markdown, XML, coding-editor style)",
                "Use-case and detail controls",
                "Placeholders instead of invented requirements",
              ],
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
            },
          ]),
        }}
      />
    </article>
  );
}
