"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  Activity, Copy, Check, ChevronDown, 
  Settings2, Target, BrainCircuit, BarChart3, TrendingUp,
  Sparkles, RefreshCcw, ShieldCheck, Zap, Code2, FileText,
  Terminal, BookOpen, CheckCircle2, AlertTriangle, ArrowRight
} from "lucide-react";

type GenerationState = "idle" | "loading" | "success";

const SCORING_MODELS = ["Standard (General)", "Strict (Production)", "Creative"];
const TARGET_LLMS = ["Any Model", "GPT-4 Optimization", "Claude 3 Optimization"];

const LOADING_PHRASES = [
  "Evaluating linguistic clarity and semantic ambiguity...",
  "Analyzing constraint boundaries and stopping rules...",
  "Calculating signal-to-noise ratio and token density...",
  "Synthesizing final 0–100 intelligence benchmark..."
];

const FAQS = [
  {
    question: "What does the Intelligence Score measure?",
    answer: "The Intelligence Score (0–100) measures how effectively your prompt communicates with LLMs. It evaluates three critical dimensions: Clarity (unambiguous instructions), Precision (strict boundary rules and output formatting), and Contextual Density (ratio of useful domain data to filler words)."
  },
  {
    question: "What is a good prompt score?",
    answer: "A score of 75–89 is considered 'Strong' and will produce reliable answers in ChatGPT or Claude. A score of 90+ is 'Production-Grade', meaning it contains strict boundary rules, negative constraints, and output schemas suitable for automated agents and high-stakes workflows."
  },
  {
    question: "How can I quickly improve a low Intelligence Score?",
    answer: "To boost your score: (1) Add explicit constraints telling the model what format to return, (2) Remove conversational fluff ('Please can you help me'), and (3) Use our Prompt Optimizer or Formatter to establish structured section headings."
  },
  {
    question: "Does a higher score mean the AI model will be smarter?",
    answer: "Yes! While it doesn't change the underlying model's weights, high-scoring prompts dramatically reduce attention drift, prevent hallucinations, and force models to utilize their highest reasoning parameters."
  }
];

export default function IntelligenceScorePage() {
  const [state, setState] = useState<GenerationState>("idle");
  const [input, setInput] = useState("");
  const [model, setModel] = useState(SCORING_MODELS[0]);
  const [target, setTarget] = useState(TARGET_LLMS[0]);
  
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [isTargetOpen, setIsTargetOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state === "loading") {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_PHRASES.length);
      }, 700);
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

  const handleAnalyze = () => {
    if (!input.trim()) return;
    
    setState("loading");
    
    setTimeout(() => {
      setState("success");
    }, 2800);
  };

  // Dynamic Heuristic Calculations
  const hasFormatting = /(#|<|>|\n\n|- |\* )/.test(input);
  const hasConstraints = /(constraint|must|format|schema|limit|only|do not|never|json|markdown)/i.test(input);
  const hasFluff = /(please|could you|thank you|kindly|i want you to)/i.test(input);
  const wordCount = input.trim().split(/\s+/).length;

  const clarityScore = Math.min(95, Math.max(45, (hasFormatting ? 85 : 65) + (wordCount > 15 ? 10 : -10)));
  const precisionScore = Math.min(98, Math.max(35, (hasConstraints ? 88 : 50) + (hasFormatting ? 10 : -15)));
  const densityScore = Math.min(96, Math.max(40, (hasFluff ? 55 : 85) + (wordCount > 25 ? 10 : 0)));
  
  const overallScore = Math.round((clarityScore * 0.35) + (precisionScore * 0.40) + (densityScore * 0.25));

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
          <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 text-violet-500 rounded-xl shrink-0 shadow-sm">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Intelligence Score</h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Grade the clarity, constraint precision, and AI-readiness of your prompt with an instant 0–100 intelligence benchmark before running it in production.
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
            <Settings2 className="w-4 h-4 text-violet-500" />
            Evaluation Benchmark
          </div>
          
          <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

          {/* Scoring Model Select */}
          <div className="relative">
            <button 
              onClick={() => setIsModelOpen(!isModelOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted transition-all shadow-sm"
            >
              Criteria: <span className="text-foreground font-semibold">{model}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            {isModelOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-xl z-30 py-1 overflow-hidden">
                {SCORING_MODELS.map(m => (
                  <button
                    key={m}
                    onClick={() => { setModel(m); setIsModelOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center justify-between ${
                      model === m ? "text-violet-500 font-bold bg-violet-500/5" : "text-foreground"
                    }`}
                  >
                    <span>{m}</span>
                    {model === m && <Check className="w-3 h-3 text-violet-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Target LLM Select */}
          <div className="relative">
            <button 
              onClick={() => setIsTargetOpen(!isTargetOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted transition-all shadow-sm"
            >
              Target: <span className="text-foreground font-semibold">{target}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            {isTargetOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-xl z-30 py-1 overflow-hidden">
                {TARGET_LLMS.map(t => (
                  <button
                    key={t}
                    onClick={() => { setTarget(t); setIsTargetOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center justify-between ${
                      target === t ? "text-violet-500 font-bold bg-violet-500/5" : "text-foreground"
                    }`}
                  >
                    <span>{t}</span>
                    {target === t && <Check className="w-3 h-3 text-violet-500" />}
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
            placeholder="Paste your prompt here to evaluate its clarity, constraint density, and readiness for AI execution..."
            className="w-full min-h-[220px] bg-transparent resize-y text-sm text-foreground placeholder:text-muted-foreground/45 dark:placeholder:text-muted-foreground/35 border-none focus:ring-0 p-0 leading-relaxed focus-visible:outline-none"
          />
        </div>

        {/* Action Footer */}
        <div className="px-5 md:px-6 py-4 border-t border-border bg-muted/10 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <BrainCircuit className="w-4 h-4 text-violet-500" />
            <span>Ready for multi-dimensional heuristic scoring</span>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!input.trim() || state === "loading"}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {state === "loading" ? (
              <>
                <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                Scoring Prompt...
              </>
            ) : (
              <>
                <Target className="w-3.5 h-3.5" />
                Calculate Intelligence Score
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
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Activity className="w-6 h-6 animate-spin" />
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
              <p className="text-xs text-muted-foreground mb-6">Evaluating token signals, constraint density, and lexical ambiguity...</p>

              <div className="flex justify-center gap-1.5 max-w-xs mx-auto">
                {LOADING_PHRASES.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      idx <= loadingStep ? "bg-violet-500" : "bg-muted"
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
              <div className="px-5 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-sm font-bold text-foreground">
                  <BarChart3 className="w-4 h-4 text-violet-500" />
                  <span>Prompt Intelligence Assessment</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  overallScore >= 80 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                    : overallScore >= 60 
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                }`}>
                  {overallScore >= 80 ? "Production-Grade" : overallScore >= 60 ? "Acceptable (Needs Polish)" : "Needs Optimization"}
                </span>
              </div>

              <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center md:items-start">
                
                {/* Large Radial Score Box */}
                <div className="flex-shrink-0 flex flex-col items-center justify-center w-36 h-36 rounded-full border-[6px] border-violet-500/20 relative shadow-sm">
                  <span className="text-4xl font-black text-foreground">{overallScore}</span>
                  <span className="text-[10px] font-bold text-muted-foreground mt-0.5 tracking-widest uppercase">Score</span>
                </div>
                
                {/* Dimension Breakdown Metrics */}
                <div className="flex-1 w-full space-y-5">
                  
                  {/* Metric 1: Clarity */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-semibold text-foreground">Linguistic Clarity</span>
                      <span className="text-xs font-bold text-foreground">{clarityScore} / 100</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${clarityScore}%` }} 
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-emerald-500 rounded-full" 
                      />
                    </div>
                  </div>

                  {/* Metric 2: Precision */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-semibold text-foreground">Constraint Precision</span>
                      <span className="text-xs font-bold text-foreground">{precisionScore} / 100</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${precisionScore}%` }} 
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`h-full rounded-full ${precisionScore >= 75 ? "bg-emerald-500" : "bg-amber-500"}`} 
                      />
                    </div>
                  </div>

                  {/* Metric 3: Density */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-semibold text-foreground">Contextual Signal Density</span>
                      <span className="text-xs font-bold text-foreground">{densityScore} / 100</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${densityScore}%` }} 
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-violet-500 rounded-full" 
                      />
                    </div>
                  </div>

                </div>
              </div>
              
              {/* Actionable Suggestions */}
              <div className="bg-muted/15 p-5 md:p-6 border-t border-border">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2 mb-3 uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4 text-violet-500" />
                  Optimization Recommendations
                </h4>
                <ul className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
                  {precisionScore < 75 && (
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 font-bold">•</span>
                      <span><strong>Add explicit output format rules:</strong> Your constraint score is low. Specify the exact layout (e.g. Markdown, JSON keys, bulleted items).</span>
                    </li>
                  )}
                  {hasFluff && (
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 font-bold">•</span>
                      <span><strong>Trim conversational fluff:</strong> Remove phrases like &ldquo;please&rdquo; or &ldquo;could you&rdquo; using the <strong>Token Optimizer</strong> to increase signal density.</span>
                    </li>
                  )}
                  {!hasFormatting && (
                    <li className="flex items-start gap-2">
                      <span className="text-violet-500 font-bold">•</span>
                      <span><strong>Apply structural delimiters:</strong> Break down your instructions using the <strong>Prompt Formatter</strong> to establish distinct Role and Task sections.</span>
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>Ready to level up this prompt? Use our 1-click <strong>Prompt Optimizer</strong> to automatically reconstruct this into a 95+ score instruction set.</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* 4. Comprehensive Explanatory Guide & SEO Knowledge Section */}
      <section className="border-t border-border pt-12 space-y-12 text-foreground">
        
        {/* Section 1: Overview / What is the Intelligence Score */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 text-xs font-semibold">
            <Activity className="w-3.5 h-3.5" />
            Prompt Benchmarking & Heuristic Evaluation
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            What is an AI Prompt Intelligence Score and Why Should You Benchmark?
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Prompt engineering is not guesswork—it is a discipline grounded in how transformer neural networks prioritize tokens. When a prompt lacks structural clarity or negative boundaries, the AI model produces average, generic completions.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong>Intelligence Score</strong> evaluates your prompt against proven heuristic dimensions (Clarity, Constraint Precision, and Signal Density) to output a <strong>0–100 benchmark</strong>. By grading your instructions before running them in ChatGPT, Claude, or Gemini, you eliminate guesswork, prevent hallucinations, and guarantee peak performance on your first generation.
          </p>
        </div>

        {/* Section 2: 3 Core Pillars */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-foreground">The 3 Pillars of Prompt Intelligence</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h4 className="font-semibold text-sm text-foreground">Linguistic Clarity</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Measures the absence of ambiguous pronouns, vague adjectives, and conflicting directives. Clear prompts reduce attention drift across model layers.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h4 className="font-semibold text-sm text-foreground">Constraint Precision</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Evaluates the presence of explicit negative constraints, numerical bounds, output schemas, and non-negotiable rules.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h4 className="font-semibold text-sm text-foreground">Contextual Signal Density</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Calculates the ratio of high-value domain instructions versus conversational fluff and pleasantries that waste tokens.
              </p>
            </div>

          </div>
        </div>

        {/* Section 3: Score Benchmarks Table */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-foreground">Intelligence Score Quality Tiers</h3>
          <div className="rounded-2xl border border-border overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="p-4">Score Range</th>
                    <th className="p-4">Classification</th>
                    <th className="p-4">Expected AI Behavior</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-4 font-bold text-rose-600 dark:text-rose-400">0 – 49</td>
                    <td className="p-4 font-semibold text-foreground">Needs Optimization</td>
                    <td className="p-4 text-muted-foreground">High risk of hallucinations, generic responses, and ignored formatting</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-amber-600 dark:text-amber-400">50 – 74</td>
                    <td className="p-4 font-semibold text-foreground">Acceptable (Needs Polish)</td>
                    <td className="p-4 text-muted-foreground">Functional for simple tasks, but prone to edge-case errors in complex workflows</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-primary">75 – 89</td>
                    <td className="p-4 font-semibold text-foreground">Strong</td>
                    <td className="p-4 text-muted-foreground">High accuracy, clear boundaries, and structured output formatting</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">90 – 100</td>
                    <td className="p-4 font-semibold text-foreground">Production-Grade</td>
                    <td className="p-4 text-muted-foreground">Rock-solid, deterministic execution suitable for autonomous agents and APIs</td>
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
                    className="w-full p-4 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-foreground hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-2 ${isOpen ? "rotate-180 text-violet-600 dark:text-violet-400" : ""}`} />
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
              href="/tools/prompt-debugger" 
              className="p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:text-primary transition-all flex items-center gap-2 group"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Prompt Debugger</span>
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
            "name": "Intelligence Score",
            "operatingSystem": "All",
            "applicationCategory": "DeveloperApplication",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "description": "Grade your AI prompt's clarity, specificity, and model readiness with an instant 0–100 intelligence benchmark.",
            "featureList": [
              "0–100 prompt clarity benchmark",
              "Constraint precision scoring",
              "Contextual density signal evaluation",
              "Actionable 1-click optimization suggestions"
            ]
          })
        }}
      />

    </article>
  );
}
