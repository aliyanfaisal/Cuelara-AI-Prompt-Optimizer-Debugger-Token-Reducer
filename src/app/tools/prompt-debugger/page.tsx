"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ShieldCheck, Check, ChevronDown,
  Settings2, Bug, AlertTriangle, CheckCircle2, ShieldAlert,
  RefreshCcw, Zap, Code2, FileText,
  BookOpen, Wand2
} from "lucide-react";
import {
  STRICTNESS_LEVELS, FOCUS_AREAS,
  type StrictnessLevel, type FocusArea,
  type DebuggerIssue, type DebuggerPassedCheck,
} from "@/lib/prompt-debugger/constants";
import { TimedProgress, type ProgressStep } from "@/components/tools/TimedProgress";

type GenerationState = "idle" | "loading" | "success";

// Paced to a real audit call's typical ~18s round trip (JSON report generation, one retry on a bad parse).
const LOADING_STEPS: ProgressStep[] = [
  { label: "Scanning for logical inconsistencies and semantic contradictions...", seconds: 4 },
  { label: "Analyzing edge-case vulnerabilities and unbounded scope risks...", seconds: 4 },
  { label: "Checking output parsing constraints against strict schemas...", seconds: 4 },
  { label: "Evaluating tone stability and bias boundaries...", seconds: 3 },
  { label: "Compiling comprehensive prompt audit report...", seconds: 3 },
];

const FAQS = [
  {
    question: "Why do AI models sometimes ignore rules in my prompt?",
    answer: "LLMs prioritize instructions based on attention weights. When prompts contain contradictory rules (e.g., 'Be extremely detailed' while also asking for 'a quick summary'), or when constraints are buried in long paragraphs, the model resolves the conflict unpredictably. Prompt Debugger surfaces these hidden contradictions before you send the prompt."
  },
  {
    question: "What is an 'Unbounded Scope Risk'?",
    answer: "Phrases like 'List all possible reasons' or 'Explain everything about X' have no explicit stopping criteria. This causes the AI to ramble, exhaust its maximum output token limit, or hallucinate fictional details to fill the open-ended request. Debugging adds hard numerical boundaries (e.g., 'List the top 5 key reasons')."
  },
  {
    question: "How do Strictness Levels change the audit?",
    answer: "'Standard' checks for major syntax breaks and missing constraints. 'High' scans for subtle edge-case traps, ambiguous pronouns, and conflicting adjectives. 'Paranoid' enforces zero-tolerance criteria, checking for potential prompt injection vectors, tone leakage, and strict defensive formatting."
  },
  {
    question: "Should I debug prompts before using them in ChatGPT/Claude or only for automated software APIs?",
    answer: "Both! For everyday use in ChatGPT or Claude, debugging saves you from wasting time on back-and-forth prompt corrections. For developers building AI apps and agents, debugging ensures your JSON outputs won't break your backend parsers in production."
  }
];

interface DebuggerUsage {
  isAuthenticated: boolean;
  promptsRemaining: number;
  promptsLimit: number;
}

export default function PromptDebuggerPage() {
  const [state, setState] = useState<GenerationState>("idle");
  const [input, setInput] = useState("");
  const [level, setLevel] = useState<StrictnessLevel>(STRICTNESS_LEVELS[1]);
  const [focus, setFocus] = useState<FocusArea>(FOCUS_AREAS[0]);

  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const [isFocusOpen, setIsFocusOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [issues, setIssues] = useState<DebuggerIssue[]>([]);
  const [passedChecks, setPassedChecks] = useState<DebuggerPassedCheck[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usage, setUsage] = useState<DebuggerUsage | null>(null);
  // Holds the real result while TimedProgress finishes its own fill/hold animation — see onFinished below.
  const [pendingResult, setPendingResult] = useState<{
    issues: DebuggerIssue[];
    passedChecks: DebuggerPassedCheck[];
    usage: DebuggerUsage | null;
  } | null>(null);
  const [isApplyingFixes, setIsApplyingFixes] = useState(false);
  const [applyFixesError, setApplyFixesError] = useState<string | null>(null);
  const [fixesApplied, setFixesApplied] = useState(false);

  const outputRef = useRef<HTMLDivElement>(null);

  const refreshUsage = async () => {
    try {
      const res = await fetch("/api/tools/prompt-debugger/usage");
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
      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, [state]);

  const handleDebug = async () => {
    if (!input.trim() || state === "loading") return;

    setState("loading");
    setErrorMessage(null);
    setApplyFixesError(null);
    setFixesApplied(false);
    setPendingResult(null);

    try {
      const res = await fetch("/api/tools/prompt-debugger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, level, focus }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(data.error || "Something went wrong. Please try again.");
        setState("idle");
        return;
      }

      // Stashed here, not applied yet — TimedProgress finishes its own fill/hold animation first (see onFinished).
      setPendingResult({
        issues: Array.isArray(data.issues) ? data.issues : [],
        passedChecks: Array.isArray(data.passedChecks) ? data.passedChecks : [],
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

  const criticalIssues = issues.filter((i) => i.severity === "critical");
  const warningIssues = issues.filter((i) => i.severity === "warning");
  const isProductionReady = issues.length === 0 || criticalIssues.length === 0;

  const handleCopyFix = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApplyAllFixes = async () => {
    if (issues.length === 0 || isApplyingFixes) return;

    setIsApplyingFixes(true);
    setApplyFixesError(null);

    try {
      const res = await fetch("/api/tools/prompt-debugger/apply-fixes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, fixes: issues.map((i) => i.fix) }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setApplyFixesError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setInput(data.rewritten);
      setFixesApplied(true);
      if (typeof data.promptsLimit === "number") {
        setUsage({
          isAuthenticated: !!data.isAuthenticated,
          promptsRemaining: data.promptsRemaining,
          promptsLimit: data.promptsLimit,
        });
      }
    } catch {
      setApplyFixesError("Network error — please check your connection and try again.");
    } finally {
      setIsApplyingFixes(false);
    }
  };

  return (
    <article className="flex flex-col w-full py-8">

      {/* 1. Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Prompt Debugger</h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Scan your prompts for logical loopholes, contradictory constraints, missing output formats, and hallucination risks before deploying to ChatGPT, Claude, or production LLM systems.
        </p>
      </motion.div>

      {/* 2. Studio Editor Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden flex flex-col mb-8 transition-shadow hover:shadow-md"
      >

        {/* Settings Bar */}
        <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Settings2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Scanner Configuration
          </div>

          <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

          {/* Strictness Level Select */}
          <div className="relative">
            <button
              onClick={() => setIsLevelOpen(!isLevelOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted transition-all shadow-sm"
            >
              Strictness: <span className="text-foreground font-semibold">{level}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            {isLevelOpen && (
              <div className="absolute top-full left-0 mt-1 w-44 bg-card border border-border rounded-xl shadow-xl z-30 py-1 overflow-hidden">
                {STRICTNESS_LEVELS.map(l => (
                  <button
                    key={l}
                    onClick={() => { setLevel(l); setIsLevelOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center justify-between ${
                      level === l ? "text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/5" : "text-foreground"
                    }`}
                  >
                    <span>{l}</span>
                    {level === l && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Focus Area Select */}
          <div className="relative">
            <button
              onClick={() => setIsFocusOpen(!isFocusOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted transition-all shadow-sm"
            >
              Focus: <span className="text-foreground font-semibold">{focus}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            {isFocusOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-xl z-30 py-1 overflow-hidden">
                {FOCUS_AREAS.map(f => (
                  <button
                    key={f}
                    onClick={() => { setFocus(f); setIsFocusOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center justify-between ${
                      focus === f ? "text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/5" : "text-foreground"
                    }`}
                  >
                    <span>{f}</span>
                    {focus === f && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Text Input Area */}
        <div className="relative p-5 md:p-6">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your prompt here to scan for vague instructions, contradictory constraints, unbound generation risks, and formatting loopholes..."
            className="w-full min-h-[220px] bg-transparent resize-y text-sm text-foreground placeholder:text-muted-foreground/45 dark:placeholder:text-muted-foreground/35 border-none focus:ring-0 p-0 leading-relaxed focus-visible:outline-none"
          />
        </div>

        {/* Action Footer */}
        <div className="px-5 md:px-6 py-4 border-t border-border bg-muted/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Target Scan Area: <strong className="text-foreground">{focus}</strong></span>
            </div>
            {usage && (
              <span>
                <strong className="text-foreground">{usage.promptsRemaining}</strong> / {usage.promptsLimit} audits left today
                {!usage.isAuthenticated && (
                  <> — <Link href="/login" className="text-primary hover:underline">sign in for more</Link></>
                )}
              </span>
            )}
          </div>

          <button
            onClick={handleDebug}
            disabled={!input.trim() || state === "loading" || usage?.promptsRemaining === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {state === "loading" ? (
              <>
                <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                Scanning Prompt...
              </>
            ) : (
              <>
                <Bug className="w-3.5 h-3.5" />
                Audit & Debug Prompt
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* 3. Output Section */}
      <div ref={outputRef} className="scroll-mt-24 mb-16">
        <AnimatePresence mode="wait">

          {/* Error State */}
          {state === "idle" && errorMessage && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 flex items-center gap-3 text-sm text-rose-600 dark:text-rose-400"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* Loading Animation Stage */}
          {state === "loading" && (
            <TimedProgress
              key="loading"
              accent="primary"
              icon={Bug}
              steps={LOADING_STEPS}
              subtitle="Running heuristic logic evaluation and constraint boundary checks..."
              slowHint="Still auditing — a stricter scan on a long prompt takes a little longer."
              done={pendingResult !== null}
              onFinished={() => {
                if (!pendingResult) return;
                setIssues(pendingResult.issues);
                setPassedChecks(pendingResult.passedChecks);
                if (pendingResult.usage) setUsage(pendingResult.usage);
                setPendingResult(null);
                setState("success");
              }}
            />
          )}

          {/* Success / Report View */}
          {state === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Audit Summary Header */}
              <div className="px-5 py-4 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${
                    isProductionReady
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                  }`}>
                    {isProductionReady ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-foreground">
                      {issues.length === 0
                        ? "No Vulnerabilities Detected"
                        : isProductionReady
                        ? `Production-Ready — ${warningIssues.length} Optional Suggestion${warningIssues.length === 1 ? "" : "s"}`
                        : `${criticalIssues.length} Critical Issue${criticalIssues.length === 1 ? "" : "s"} Detected`}
                    </span>
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      ({level} Strictness • {focus})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isProductionReady && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      Fixes Required
                    </span>
                  )}
                  {issues.length > 0 && (
                    <button
                      onClick={handleApplyAllFixes}
                      disabled={isApplyingFixes}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isApplyingFixes ? (
                        <>
                          <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                          Rewriting...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3.5 h-3.5" />
                          Apply All Fixes
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {applyFixesError && (
                <div className="px-5 md:px-6 pt-4 flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{applyFixesError}</span>
                </div>
              )}

              {fixesApplied && (
                <div className="px-5 md:px-6 pt-4 flex items-start gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Your prompt above was rewritten to incorporate every fix. Re-run the audit to verify.</span>
                </div>
              )}

              {/* Findings List */}
              <div className="p-5 md:p-6 space-y-4">

                {issues.map((issue) => {
                  const isCritical = issue.severity === "critical";
                  return (
                    <div
                      key={issue.id}
                      className={`p-4 rounded-xl border space-y-2.5 ${
                        isCritical ? "border-rose-500/20 bg-rose-500/5" : "border-amber-500/20 bg-amber-500/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isCritical ? "text-rose-500" : "text-amber-600 dark:text-amber-400"}`} />
                          <div>
                            <h4 className={`text-xs font-bold ${isCritical ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"}`}>
                              {issue.title}
                            </h4>
                            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                              {issue.explanation}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-background border border-border rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                        <div className="font-mono text-emerald-600 dark:text-emerald-400">
                          <span className="text-muted-foreground font-normal select-none">Recommended Constraint: </span>
                          &ldquo;{issue.fix}&rdquo;
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleCopyFix(issue.fix, issue.id)}
                            className="px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 text-[11px] font-medium text-foreground border border-border transition-colors"
                          >
                            {copiedId === issue.id ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {passedChecks.map((check, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{check.title}</h4>
                        <p className="text-[11px] text-muted-foreground">{check.detail}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider shrink-0">Passed</span>
                  </div>
                ))}

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* 4. Comprehensive Explanatory Guide & SEO Knowledge Section */}
      <section className="border-t border-border pt-12 space-y-12 text-foreground">

        {/* Section 1: Overview / Why Debug Prompts */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            AI Quality Assurance & Reliability
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Why Prompt Debugging is Essential for Reliable AI Responses
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Unlike traditional software where code errors throw clear stack traces and compiler warnings, AI prompts <strong>fail silently</strong>. When a prompt contains subtle contradictions, missing negative constraints, or ambiguous terms, the AI model won&rsquo;t notify you of an error—it will simply produce hallucinations, ignore your rules, or return broken formatting.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong>Prompt Debugger</strong> acts as an automated static analyzer for your instructions. By auditing your prompt against proven prompt engineering heuristics, it highlights logical loopholes and supplies copy-ready patches to guarantee rock-solid AI execution on your very first run.
          </p>
        </div>

        {/* Section 2: 4 Critical Prompt Flaws */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-foreground">4 Critical Prompt Flaws Caught by the Debugger</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h4 className="font-semibold text-sm text-foreground">Contradictory Instructions</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Asking an AI to &ldquo;be extremely concise&rdquo; while also instructing it to &ldquo;explain all technical details thoroughly&rdquo; creates an internal priority conflict that causes hallucinations.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h4 className="font-semibold text-sm text-foreground">Unbounded Output Scope</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Commands like &ldquo;give me all examples&rdquo; lack stopping rules, leading to rambling responses that consume unnecessary tokens and truncate mid-sentence.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h4 className="font-semibold text-sm text-foreground">Missing Schema & Layout Constraints</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Failing to specify exact output formats (Markdown headings, tables, JSON schemas) results in unpredictable conversational padding and messy layouts.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                4
              </div>
              <h4 className="font-semibold text-sm text-foreground">Ambiguous Pronouns & Context Gaps</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Vague references like &ldquo;it should do this depending on that&rdquo; confuse the model&rsquo;s attention heads, resulting in incorrect variable assumptions.
              </p>
            </div>

          </div>
        </div>

        {/* Section 3: Flaw Breakdown Table */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-foreground">Common Prompt Vulnerabilities & Their Instant Fixes</h3>
          <div className="rounded-2xl border border-border overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="p-4">Detected Vulnerability</th>
                    <th className="p-4 text-rose-600 dark:text-rose-400">What Goes Wrong</th>
                    <th className="p-4 text-emerald-600 dark:text-emerald-400">Debugger Recommended Patch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-4 font-semibold text-foreground">Vague Summary Request</td>
                    <td className="p-4 text-muted-foreground">AI outputs 500 words of generic prose without takeaways</td>
                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">&ldquo;Summarize into exactly 3 bullet points, max 20 words each.&rdquo;</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-foreground">Unspecified Code Format</td>
                    <td className="p-4 text-muted-foreground">AI includes placeholder comments and conversational filler</td>
                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">&ldquo;Provide complete, executable code only. No placeholders or chit-chat.&rdquo;</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-foreground">Missing Source Discipline</td>
                    <td className="p-4 text-muted-foreground">AI invents plausible-sounding facts when unsure</td>
                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">&ldquo;If the answer is not confirmed in context, state &apos;Data unavailable&apos;.&rdquo;</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Section 4: FAQs */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-foreground">Frequently Asked Questions</h3>
          <div className="space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className="rounded-xl border border-border bg-card overflow-hidden transition-all">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-4 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-2 ${isOpen ? "rotate-180 text-emerald-600 dark:text-emerald-400" : ""}`} />
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

        {/* Section 5: Internal Ecosystem Links */}
        <div className="p-6 rounded-2xl border border-border bg-muted/20 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Explore Related Prompt Engineering Tools</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <Link
              href="/tools/prompt-optimizer"
              className="p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:text-primary transition-all flex items-center gap-2 group"
            >
              <Code2 className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Prompt Optimizer</span>
            </Link>

            <Link
              href="/tools/context-extractor"
              className="p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:text-primary transition-all flex items-center gap-2 group"
            >
              <FileText className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Context Extractor</span>
            </Link>

            <Link
              href="/tools/token-optimizer"
              className="p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:text-primary transition-all flex items-center gap-2 group"
            >
              <Zap className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Token Optimizer</span>
            </Link>

            <Link
              href="/cookbook"
              className="p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:text-primary transition-all flex items-center gap-2 group"
            >
              <BookOpen className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Prompt Cookbook</span>
            </Link>
          </div>
        </div>

      </section>

      {/* JSON-LD Structured Data Schema for Google SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Prompt Debugger",
            "operatingSystem": "All",
            "applicationCategory": "DeveloperApplication",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "description": "Scan and audit AI prompts for logical contradictions, missing constraints, bias, and hallucination risks.",
            "featureList": [
              "Multi-strictness prompt vulnerability scanning",
              "Contradictory instruction detection",
              "Unbounded output scope analysis",
              "Instant one-click patch recommendations"
            ]
          })
        }}
      />

    </article>
  );
}
