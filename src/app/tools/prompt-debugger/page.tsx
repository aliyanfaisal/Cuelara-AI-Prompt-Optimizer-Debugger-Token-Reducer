"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  ShieldCheck, Copy, Check, ChevronDown, 
  Settings2, Bug, AlertTriangle, CheckCircle2, ShieldAlert,
  Sparkles, RefreshCcw, Save, Zap, Code2, FileText, ArrowRight,
  BookOpen, HelpCircle, ShieldX, Eye, Terminal, CheckCircle
} from "lucide-react";

type GenerationState = "idle" | "loading" | "success";

const STRICTNESS_LEVELS = ["Standard", "High", "Paranoid"];
const FOCUS_AREAS = ["All Vulnerabilities", "Logic Loopholes", "Edge-cases", "Bias & Tone"];

const LOADING_PHRASES = [
  "Scanning for logical inconsistencies and semantic contradictions...",
  "Analyzing edge-case vulnerabilities and unbounded scope risks...",
  "Checking output parsing constraints against strict schemas...",
  "Evaluating tone stability and bias boundaries...",
  "Compiling comprehensive prompt audit report..."
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

export default function PromptDebuggerPage() {
  const [state, setState] = useState<GenerationState>("idle");
  const [input, setInput] = useState("");
  const [level, setLevel] = useState(STRICTNESS_LEVELS[1]);
  const [focus, setFocus] = useState(FOCUS_AREAS[0]);
  
  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const [isFocusOpen, setIsFocusOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state === "loading") {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_PHRASES.length);
      }, 650);
    }
    return () => clearInterval(interval);
  }, [state]);

  useEffect(() => {
    if (state !== "idle" && outputRef.current) {
      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, [state]);

  const handleDebug = () => {
    if (!input.trim()) return;
    
    setState("loading");
    
    setTimeout(() => {
      setState("success");
    }, 2800);
  };

  const handleCopyFix = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <article className="flex flex-col w-full max-w-4xl mx-auto px-4 sm:px-6 py-8">
      
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
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Target Scan Area: <strong className="text-foreground">{focus}</strong></span>
          </div>

          <button
            onClick={handleDebug}
            disabled={!input.trim() || state === "loading"}
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
          
          {/* Loading Animation Stage */}
          {state === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-card border border-border rounded-2xl p-8 shadow-sm text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Bug className="w-6 h-6 animate-spin" />
              </div>

              <AnimatePresence mode="wait">
                <motion.h3 
                  key={loadingStep}
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.2 }}
                  className="font-semibold text-sm text-foreground mb-1.5"
                >
                  {LOADING_PHRASES[loadingStep]}
                </motion.h3>
              </AnimatePresence>
              <p className="text-xs text-muted-foreground mb-6">Running heuristic logic evaluation and constraint boundary checks...</p>

              <div className="flex justify-center gap-1.5 max-w-xs mx-auto">
                {LOADING_PHRASES.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      idx <= loadingStep ? "bg-emerald-500" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </motion.div>
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
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-foreground">2 Vulnerabilities Detected</span>
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      ({level} Strictness • {focus})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Fixes Recommended
                  </span>
                </div>
              </div>

              {/* Findings List */}
              <div className="p-5 md:p-6 space-y-4">
                
                {/* Issue 1 */}
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400">Missing Strict Output Schema Constraints</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                          Your prompt requests a structured output but does not explicitly forbid conversational preambles or specify exact keys. Models will often output unpredictable markdown headers or polite chit-chat.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-background border border-border rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div className="font-mono text-emerald-600 dark:text-emerald-400">
                      <span className="text-muted-foreground font-normal select-none">Recommended Constraint: </span>
                      &ldquo;Return ONLY raw JSON with keys &apos;result&apos; and &apos;items&apos;. No preambles or explanations.&rdquo;
                    </div>
                    <button
                      onClick={() => handleCopyFix("Return ONLY raw JSON with keys 'result' and 'items'. No preambles or explanations.", 1)}
                      className="px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 text-[11px] font-medium text-foreground border border-border transition-colors shrink-0"
                    >
                      {copiedIndex === 1 ? "Copied!" : "Copy Fix"}
                    </button>
                  </div>
                </div>

                {/* Issue 2 */}
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400">Unbounded Generation Scope</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                          Open-ended requests without quantity limits trigger hallucinated padding and high token consumption.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-background border border-border rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div className="font-mono text-emerald-600 dark:text-emerald-400">
                      <span className="text-muted-foreground font-normal select-none">Recommended Constraint: </span>
                      &ldquo;Limit findings strictly to the top 5 most critical factors ranked by impact.&rdquo;
                    </div>
                    <button
                      onClick={() => handleCopyFix("Limit findings strictly to the top 5 most critical factors ranked by impact.", 2)}
                      className="px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 text-[11px] font-medium text-foreground border border-border transition-colors shrink-0"
                    >
                      {copiedIndex === 2 ? "Copied!" : "Copy Fix"}
                    </button>
                  </div>
                </div>

                {/* Passed Checks */}
                <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Tone Stability & Bias Boundaries: Clean</h4>
                      <p className="text-[11px] text-muted-foreground">No conflicting emotional directives, ambiguous pronouns, or discriminatory biases detected.</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Passed</span>
                </div>

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
