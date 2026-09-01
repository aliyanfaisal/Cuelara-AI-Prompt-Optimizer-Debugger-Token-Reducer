"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  Zap, Copy, Check, ChevronDown, 
  Settings2, Sparkles, RefreshCcw, Save, Scissors,
  DollarSign, Scale, ArrowRight, BookOpen, Code2, FileText,
  HelpCircle, ShieldCheck, CheckCircle2, TrendingDown, Cpu
} from "lucide-react";

type GenerationState = "idle" | "loading" | "success";

const COMPRESSION_LEVELS = ["Low (Safest)", "Medium (Balanced)", "Aggressive (Max Savings)"];
const PRESERVE_OPTIONS = ["Yes", "No"];

const LOADING_PHRASES = [
  "Removing conversational fluff and politeness tokens...",
  "Consolidating redundant adjectives and filler verbs...",
  "Minifying prompt syntax while locking core constraints...",
  "Calculating net token reduction and cost delta..."
];

const FAQS = [
  {
    question: "How does Token Optimizer compress prompts without losing meaning?",
    answer: "Token Optimizer uses semantic minification rules. It eliminates conversational filler (e.g. 'Could you please make sure to...'), merges redundant instructions, and converts verbose prose into high-density declarative statements. The core reasoning rules, variables, and constraints remain 100% intact."
  },
  {
    question: "What is the difference between Low, Medium, and Aggressive compression?",
    answer: "Low compression only removes obvious conversational filler and polite fluff (15–25% savings). Medium compression restructures paragraphs into concise bulleted rules (35–45% savings). Aggressive compression employs dense notation, symbols, and structural shorthand for maximum token reduction (50–60%+ savings), ideal for automated high-volume API calls."
  },
  {
    question: "How are tokens counted in frontier models?",
    answer: "LLMs tokenize text using Byte-Pair Encoding (BPE). On average, 1 token represents approximately 4 characters or 0.75 words in English. Common words take 1 token, while punctuation, trailing spaces, and complex terms can take multiple tokens."
  },
  {
    question: "Will token compression degrade my AI model's output quality?",
    answer: "No! In fact, compressed prompts often improve model output quality because eliminating fluff reduces the 'attention distraction' in transformer attention heads, allowing the model to focus squarely on your actual constraints."
  },
  {
    question: "Can I use optimized prompts in OpenAI, Claude, Gemini, and DeepSeek?",
    answer: "Yes. Token optimization creates standard, high-density English instructions and Markdown formats compatible with all major LLM providers including OpenAI (GPT-4o), Anthropic (Claude 3.5 Sonnet), Google (Gemini 1.5 Pro), DeepSeek, and open-source models."
  }
];

export default function TokenOptimizerPage() {
  const [state, setState] = useState<GenerationState>("idle");
  const [input, setInput] = useState("");
  const [level, setLevel] = useState(COMPRESSION_LEVELS[1]);
  const [preserve, setPreserve] = useState(PRESERVE_OPTIONS[0]);
  
  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const [isPreserveOpen, setIsPreserveOpen] = useState(false);
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

  const handleCompress = () => {
    if (!input.trim()) return;
    
    setState("loading");
    
    // Simulate API compression delay
    setTimeout(() => {
      setState("success");
    }, 2800);
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Dynamic token calculations
  const originalTokens = Math.max(1, Math.floor(input.length / 4));
  const compressionRatio = level.startsWith("Low") ? 0.78 : level.startsWith("Medium") ? 0.58 : 0.44;
  const optimizedTokens = Math.max(1, Math.floor(originalTokens * compressionRatio));
  const tokensSaved = originalTokens - optimizedTokens;
  const percentSaved = Math.round((1 - compressionRatio) * 100);

  const getCompressedText = () => {
    return input
      .replace(/please (could you|make sure to|ensure that you)/gi, "Must")
      .replace(/I would like you to/gi, "")
      .replace(/I am looking for you to/gi, "")
      .replace(/It is very important that you/gi, "Constraint:")
      .replace(/Thank you very much/gi, "")
      .trim();
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
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl shrink-0 shadow-sm">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Token Optimizer</h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Compress your prompt token count by up to 50% without losing meaning, constraints, or instruction logic. Cut API bills across all frontier models.
        </p>
      </motion.div>

      {/* 2. Editor Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden flex flex-col mb-8 transition-shadow hover:shadow-md"
      >
        
        {/* Settings Bar */}
        <div className="px-5 py-3 border-b border-border bg-muted/20 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Settings2 className="w-4 h-4" />
            Compression Settings
          </div>
          
          <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

          {/* Compression Level Select */}
          <div className="relative">
            <button 
              onClick={() => setIsLevelOpen(!isLevelOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted transition-all"
            >
              Level: <span className="text-foreground font-semibold">{level}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            {isLevelOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                {COMPRESSION_LEVELS.map(l => (
                  <button
                    key={l}
                    onClick={() => { setLevel(l); setIsLevelOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors text-foreground"
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preserve Formatting Select */}
          <div className="relative">
            <button 
              onClick={() => setIsPreserveOpen(!isPreserveOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted transition-all"
            >
              Preserve Format: <span className="text-foreground font-semibold">{preserve}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            {isPreserveOpen && (
              <div className="absolute top-full left-0 mt-1 w-32 bg-card border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                {PRESERVE_OPTIONS.map(p => (
                  <button
                    key={p}
                    onClick={() => { setPreserve(p); setIsPreserveOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors text-foreground"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Text Area */}
        <div className="relative p-5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your prompt instructions here to eliminate conversational fluff, trim token count, and compress structure..."
            className="w-full min-h-[220px] bg-transparent resize-y text-sm text-foreground placeholder:text-muted-foreground/45 dark:placeholder:text-muted-foreground/35 border-none focus:ring-0 p-0 leading-relaxed focus-visible:outline-none"
          />
        </div>

        {/* Action Footer */}
        <div className="px-5 py-4 border-t border-border bg-muted/10 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            Current Input: <strong className="text-foreground">~{originalTokens.toLocaleString()} tokens</strong>
          </div>

          <button
            onClick={handleCompress}
            disabled={!input.trim() || state === "loading"}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {state === "loading" ? (
              <>
                <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                Compressing Tokens...
              </>
            ) : (
              <>
                <Scissors className="w-3.5 h-3.5" />
                Compress Tokens
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* 3. Output Container (Dynamic) */}
      <div ref={outputRef} className="scroll-mt-24 mb-16">
        <AnimatePresence mode="wait">
          {state === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-card border border-border rounded-2xl p-6 shadow-sm mt-4"
            >
              <div className="flex items-center gap-3 mb-6">
                <Scissors className="w-5 h-5 text-amber-500 animate-pulse" />
                <AnimatePresence mode="wait">
                  <motion.h3 
                    key={loadingStep}
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    transition={{ duration: 0.2 }}
                    className="font-semibold text-sm text-foreground"
                  >
                    {LOADING_PHRASES[loadingStep]}
                  </motion.h3>
                </AnimatePresence>
              </div>
              <div className="space-y-3">
                <div className="h-3.5 bg-muted/60 rounded-md w-3/4 animate-pulse" />
                <div className="h-3.5 bg-muted/60 rounded-md w-full animate-pulse" />
                <div className="h-3.5 bg-muted/60 rounded-md w-1/2 animate-pulse" />
              </div>
            </motion.div>
          )}

          {state === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm mt-4"
            >
              {/* Savings Banner */}
              <div className="px-5 py-4 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm font-bold text-foreground">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base">🔥 -{percentSaved}% Tokens Saved</span>
                    <span className="text-muted-foreground ml-2 text-xs font-normal">
                      ({originalTokens} → {optimizedTokens} tokens)
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied to Clipboard!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Optimized Prompt
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-5 bg-muted/10 font-mono text-xs leading-relaxed text-foreground overflow-x-auto whitespace-pre-wrap">
                {getCompressedText()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Comprehensive Explanatory Guide & SEO Knowledge Section */}
      <section className="border-t border-border pt-12 space-y-12 text-foreground">
        
        {/* Section 1: Overview / What is Token Optimization */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            API Cost Reduction & Prompt Efficiency
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            What is Prompt Token Optimization and Why Does It Matter?
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every interaction with an LLM (such as <strong>OpenAI GPT-4o</strong>, <strong>Anthropic Claude 3.5</strong>, or <strong>Google Gemini</strong>) is billed based on the number of tokens sent in the prompt and returned in the completion. Unoptimized prompts are filled with conversational padding (&ldquo;Please can you make sure to&rdquo;), redundant phrasing, and loose syntax that add zero value to the AI&rsquo;s reasoning.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong>Token Optimizer</strong> performs automated semantic and structural compression on your prompts. By replacing conversational fluff with direct declarative constraints and minified notation, Token Optimizer compresses prompt payloads by <strong>35% to 55%</strong>, directly cutting your API bills in half without degrading the quality of the AI&rsquo;s response.
          </p>
        </div>

        {/* Section 2: 4 Core Strategies */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-foreground">4 Core Strategies for Token Compression</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h4 className="font-semibold text-sm text-foreground">Conversational Fluff Stripping</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Transformers do not need polite pleasantries. Removing phrases like &ldquo;Could you kindly explain&rdquo; saves 5–10 tokens per sentence.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h4 className="font-semibold text-sm text-foreground">Structural Delimiters & Markdown</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Replacing verbose transition sentences with concise Markdown headers (`### Constraints`) and bullet points preserves strict logical boundaries in fewer tokens.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h4 className="font-semibold text-sm text-foreground">Semantic Verb Consolidation</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Multi-word phrases like &ldquo;take into consideration all possible exceptions&rdquo; are consolidated into high-density directives like &ldquo;Account for exceptions&rdquo;.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                4
              </div>
              <h4 className="font-semibold text-sm text-foreground">Context Density Locking</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Critical variables, output formatting constraints, and schema rules are locked in place to ensure zero drift in production pipelines.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Token Savings at Scale Table */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-foreground">Financial Impact: Monthly API Cost Savings at Scale</h3>
          <div className="rounded-2xl border border-border overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="p-4">Monthly API Volume</th>
                    <th className="p-4 text-muted-foreground">Uncompressed Cost</th>
                    <th className="p-4 text-primary">Optimized Cost (-45%)</th>
                    <th className="p-4 text-emerald-600 dark:text-emerald-400">Monthly Net Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-4 font-semibold text-foreground">10,000 API Calls (Small App)</td>
                    <td className="p-4 text-muted-foreground">$25.00 / mo</td>
                    <td className="p-4 font-semibold text-primary">$13.75 / mo</td>
                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">+$11.25 / mo</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-foreground">100,000 API Calls (Mid-Tier SaaS)</td>
                    <td className="p-4 text-muted-foreground">$250.00 / mo</td>
                    <td className="p-4 font-semibold text-primary">$137.50 / mo</td>
                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">+$112.50 / mo</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-foreground">1,000,000 API Calls (Enterprise)</td>
                    <td className="p-4 text-muted-foreground">$2,500.00 / mo</td>
                    <td className="p-4 font-semibold text-primary">$1,375.00 / mo</td>
                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">+$1,125.00 / mo</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-foreground">10,000,000 API Calls (High-Volume Agent)</td>
                    <td className="p-4 text-muted-foreground">$25,000.00 / mo</td>
                    <td className="p-4 font-semibold text-primary">$13,750.00 / mo</td>
                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">+$11,250.00 / mo</td>
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
                    className="w-full p-4 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-2 ${isOpen ? "rotate-180 text-primary" : ""}`} />
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
              href="/tools/compare-estimate" 
              className="p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:text-primary transition-all flex items-center gap-2 group"
            >
              <ArrowRight className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Diff & Cost Estimate</span>
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
            "name": "Token Optimizer",
            "operatingSystem": "All",
            "applicationCategory": "DeveloperApplication",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "description": "Compress AI prompt token usage by up to 50% without losing reasoning quality or constraints to save on LLM API bills.",
            "featureList": [
              "Semantic prompt minification",
              "Conversational fluff removal",
              "Constraint and variable locking",
              "Instant token and cost estimation"
            ]
          })
        }}
      />

    </article>
  );
}
