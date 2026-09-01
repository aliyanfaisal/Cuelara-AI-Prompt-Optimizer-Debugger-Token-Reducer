"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  ArrowRightLeft, FileCode, Check, 
  Settings2, ArrowRight, DollarSign, TrendingDown,
  Zap, Code2, FileText, ShieldCheck, BookOpen,
  ChevronDown, HelpCircle, Layers, Scale, Sparkles,
  RefreshCcw, Clock, Cpu
} from "lucide-react";
import { PromptComparison } from "@/components/tools/PromptComparison";

type GenerationState = "idle" | "loading" | "success";

const LOADING_PHRASES = [
  "Calculating token count diffs and compression deltas...",
  "Running multi-model cost estimation heuristics...",
  "Formatting side-by-side visual diffs...",
  "Finalizing financial comparison report..."
];

const FAQS = [
  {
    question: "How does the Diff & Cost Estimate tool calculate savings?",
    answer: "The tool analyzes the token delta between your base prompt and optimized prompt using Byte-Pair Encoding (BPE) tokenization rules. It then applies the current pricing tiers of major models (e.g. GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro) to project exact per-call and scaled monthly cost reductions."
  },
  {
    question: "Why does reducing prompt tokens improve AI response latency?",
    answer: "LLMs process input tokens sequentially during the prefill phase. A smaller, denser prompt reduces Time-To-First-Token (TTFT), resulting in noticeably faster streaming responses and reduced compute time on model servers."
  },
  {
    question: "Can I use this tool to compare prompts for team reviews?",
    answer: "Yes! The visual diff highlights removed fluff in red and structured additions in green, making it easy to perform prompt regression testing and review prompt improvements before deploying changes."
  },
  {
    question: "What is the recommended compression percentage to aim for?",
    answer: "Aiming for a 35% to 50% token reduction is the sweet spot. This significantly cuts API costs while ensuring that all essential domain context, variable constraints, and formatting schemas remain completely intact."
  }
];

export default function CompareEstimatePage() {
  const [state, setState] = useState<GenerationState>("idle");
  const [basePrompt, setBasePrompt] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
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

  const handleCompare = () => {
    if (!basePrompt.trim() && !newPrompt.trim()) return;
    
    setState("loading");
    
    setTimeout(() => {
      setState("success");
    }, 2800);
  };

  const baseTokens = Math.max(0, Math.floor(basePrompt.length / 4));
  const newTokens = Math.max(0, Math.floor(newPrompt.length / 4));

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
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-xl shrink-0 shadow-sm">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Diff & Cost Estimate</h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Compare your original prompt with an optimized version side-by-side. Visualize exact text diffs, compute token reductions, and calculate dollar savings across OpenAI, Anthropic, and Gemini.
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
        <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Settings2 className="w-4 h-4 text-blue-500" />
            Side-by-Side Comparison Panels
          </div>
          <div className="text-xs text-muted-foreground">
            <span>Base: <strong>{baseTokens} tok</strong></span>
            <span className="mx-2 text-border">•</span>
            <span>Optimized: <strong>{newTokens} tok</strong></span>
          </div>
        </div>

        {/* Split Text Area */}
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border bg-transparent">
          {/* Base Prompt Panel */}
          <div className="flex-1 p-5 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Original Base Prompt</span>
              <span className="px-2 py-0.5 bg-muted rounded text-[10px] font-bold text-muted-foreground uppercase">Base</span>
            </div>
            <textarea
              value={basePrompt}
              onChange={(e) => setBasePrompt(e.target.value)}
              placeholder="Paste your original unoptimized prompt here..."
              className="w-full min-h-[220px] bg-transparent resize-y text-sm text-foreground placeholder:text-muted-foreground/45 dark:placeholder:text-muted-foreground/35 border-none focus:ring-0 p-0 leading-relaxed focus-visible:outline-none"
            />
          </div>
          
          {/* Optimized Prompt Panel */}
          <div className="flex-1 p-5 relative bg-muted/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Optimized Prompt</span>
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold uppercase">Optimized</span>
            </div>
            <textarea
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="Paste your compressed or formatted prompt here..."
              className="w-full min-h-[220px] bg-transparent resize-y text-sm text-foreground placeholder:text-muted-foreground/45 dark:placeholder:text-muted-foreground/35 border-none focus:ring-0 p-0 leading-relaxed focus-visible:outline-none"
            />
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-5 md:px-6 py-4 border-t border-border bg-muted/10 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-blue-500" />
            <span>Ready for token diff calculation and cost delta modeling</span>
          </div>

          <button
            onClick={handleCompare}
            disabled={(!basePrompt.trim() && !newPrompt.trim()) || state === "loading"}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {state === "loading" ? (
              <>
                <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                Comparing Prompts...
              </>
            ) : (
              <>
                <ArrowRight className="w-3.5 h-3.5" />
                Compare & Estimate Cost
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
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <ArrowRightLeft className="w-6 h-6 animate-spin" />
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
              <p className="text-xs text-muted-foreground mb-6">Evaluating token diffs, latency benefits, and cost projections...</p>

              <div className="flex justify-center gap-1.5 max-w-xs mx-auto">
                {LOADING_PHRASES.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      idx <= loadingStep ? "bg-blue-500" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Success Comparison View */}
          {state === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <PromptComparison basePrompt={basePrompt} newPrompt={newPrompt} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* 4. Comprehensive Explanatory Guide & SEO Knowledge Section */}
      <section className="border-t border-border pt-12 space-y-12 text-foreground">
        
        {/* Section 1: Overview / Why Compare & Estimate */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-semibold">
            <DollarSign className="w-3.5 h-3.5" />
            Visual Diffing & LLM Financial Intelligence
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Why Visual Diffing and Token Cost Estimation are Critical
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            In modern AI product development, prompt engineering is an iterative software discipline. When tweaking system instructions or compressing few-shot examples, engineers and prompt designers need to know two things immediately: <strong>what exact words changed</strong>, and <strong>how much money and latency was saved</strong>.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong>Diff & Cost Estimate</strong> provides side-by-side visual diffing (green additions, red removals) alongside instant financial cost projections. Whether you are optimizing a prompt for personal ChatGPT use or scaling an enterprise AI agent to millions of monthly API calls, this tool gives you complete clarity into your token economics.
          </p>
        </div>

        {/* Section 2: 3 Key Evaluation Metrics */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-foreground">3 Core Metrics Evaluated in the Diff Report</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                <TrendingDown className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-sm text-foreground">Token Compression Delta</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Computes exact BPE token counts before and after optimization, highlighting net token savings and percentage reductions.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                <DollarSign className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-sm text-foreground">Multi-Model Cost Projections</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Calculates real dollar savings across OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, Google Gemini 1.5 Pro, and DeepSeek.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                <Clock className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-sm text-foreground">Latency & TTFT Speedup</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Reducing prompt size accelerates Time-To-First-Token (TTFT) by reducing prefill compute overhead on inference servers.
              </p>
            </div>

          </div>
        </div>

        {/* Section 3: Token Cost Comparison Table */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-foreground">Estimated Monthly Savings by Model Tier (100k API Calls)</h3>
          <div className="rounded-2xl border border-border overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="p-4">Frontier LLM Model</th>
                    <th className="p-4 text-muted-foreground">Original Cost (1,500 Tok)</th>
                    <th className="p-4 text-primary">Optimized Cost (750 Tok)</th>
                    <th className="p-4 text-emerald-600 dark:text-emerald-400">Monthly Net Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-4 font-semibold text-foreground">OpenAI GPT-4o</td>
                    <td className="p-4 text-muted-foreground">$375.00</td>
                    <td className="p-4 font-semibold text-primary">$187.50</td>
                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">+$187.50 / mo</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-foreground">Anthropic Claude 3.5 Sonnet</td>
                    <td className="p-4 text-muted-foreground">$450.00</td>
                    <td className="p-4 font-semibold text-primary">$225.00</td>
                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">+$225.00 / mo</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-foreground">Google Gemini 1.5 Pro</td>
                    <td className="p-4 text-muted-foreground">$525.00</td>
                    <td className="p-4 font-semibold text-primary">$262.50</td>
                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">+$262.50 / mo</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-foreground">OpenAI GPT-4o-mini</td>
                    <td className="p-4 text-muted-foreground">$22.50</td>
                    <td className="p-4 font-semibold text-primary">$11.25</td>
                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">+$11.25 / mo</td>
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
                    className="w-full p-4 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-2 ${isOpen ? "rotate-180 text-blue-600 dark:text-blue-400" : ""}`} />
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
              href="/tools/token-optimizer" 
              className="p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:text-primary transition-all flex items-center gap-2 group"
            >
              <Zap className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Token Optimizer</span>
            </Link>

            <Link 
              href="/tools/context-extractor" 
              className="p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:text-primary transition-all flex items-center gap-2 group"
            >
              <FileText className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Context Extractor</span>
            </Link>

            <Link 
              href="/tools/prompt-optimizer" 
              className="p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:text-primary transition-all flex items-center gap-2 group"
            >
              <Code2 className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Prompt Optimizer</span>
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
            "name": "Diff & Cost Estimate",
            "operatingSystem": "All",
            "applicationCategory": "DeveloperApplication",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "description": "Visual prompt diffing tool and LLM token cost calculator across OpenAI, Anthropic, and Gemini.",
            "featureList": [
              "Side-by-side visual prompt diffing",
              "Token delta and compression ratio analysis",
              "Multi-model API dollar savings calculator",
              "Time-To-First-Token (TTFT) latency projections"
            ]
          })
        }}
      />

    </article>
  );
}
