"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowRightLeft, FileCode,
  Settings2, ArrowRight, DollarSign, TrendingDown,
  Zap, Code2, FileText, BookOpen,
  ChevronDown, Clock
} from "lucide-react";
import { PromptComparison } from "@/components/tools/PromptComparison";
import { countPromptTokens } from "@/lib/token-count";
import { getPricedModel, estimateCost, formatUsd, PRICING_AS_OF } from "@/lib/model-pricing";

type GenerationState = "idle" | "success";

const FAQS = [
  {
    question: "How does the Diff & Cost Estimate tool calculate savings?",
    answer: "The tool tokenizes both prompts with the same encoding frontier models use, then applies published per-model input and output token pricing (GPT-4o, Claude Sonnet 5, Gemini 3.6 Flash, DeepSeek, and more) to project monthly cost reductions at 1K to 1M+ requests. Output length is held equal on both sides, since shortening a prompt only reduces input cost."
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

// Static SEO example: a 1,500-token prompt trimmed to 750 tokens, 100k input-only calls a month.
// Derived from the shared pricing table so it can't drift from the live calculator.
const EXAMPLE_MODEL_IDS = ["gpt-4o", "claude-sonnet-5", "gemini-3-6-flash", "gpt-4o-mini"];
const EXAMPLE_ROWS = EXAMPLE_MODEL_IDS.map((id) => {
  const model = getPricedModel(id);
  const original = estimateCost(model, 1500, 0, 100_000).total;
  const optimized = estimateCost(model, 750, 0, 100_000).total;
  return { name: model.name, provider: model.provider, original, optimized, saved: original - optimized };
});

export default function CompareEstimatePage() {
  const [state, setState] = useState<GenerationState>("idle");
  const [basePrompt, setBasePrompt] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state !== "idle" && outputRef.current) {
      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, [state]);

  const handleCompare = () => {
    if (!basePrompt.trim() && !newPrompt.trim()) return;
    setState("success");
  };

  const baseTokens = useMemo(() => countPromptTokens(basePrompt), [basePrompt]);
  const newTokens = useMemo(() => countPromptTokens(newPrompt), [newPrompt]);

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
            disabled={!basePrompt.trim() && !newPrompt.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Compare & Estimate Cost
          </button>
        </div>
      </motion.div>

      {/* 3. Output Section */}
      <div ref={outputRef} className="scroll-mt-24 mb-16">
        <AnimatePresence mode="wait">

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
                Calculates real dollar savings across OpenAI GPT-4o, Anthropic Claude Sonnet 5, Google Gemini 3.6 Flash, and DeepSeek.
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
          <p className="text-xs text-muted-foreground">Input-token savings only, based on published pricing as of {PRICING_AS_OF} — use the live calculator above for your own prompt, output length, and volume.</p>
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
                  {EXAMPLE_ROWS.map((row) => (
                    <tr key={row.name}>
                      <td className="p-4 font-semibold text-foreground">{row.provider} {row.name}</td>
                      <td className="p-4 text-muted-foreground">{formatUsd(row.original)}</td>
                      <td className="p-4 font-semibold text-primary">{formatUsd(row.optimized)}</td>
                      <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">+{formatUsd(row.saved)} / mo</td>
                    </tr>
                  ))}
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
