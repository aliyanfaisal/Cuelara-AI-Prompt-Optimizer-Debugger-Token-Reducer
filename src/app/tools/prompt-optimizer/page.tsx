"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  Wand2, Code2, Copy, Check, ChevronDown, 
  Settings2, Sparkles, RefreshCcw, Save, Zap,
  FileText, ArrowRight, BookOpen, CheckCircle2,
  Layers, Sliders, Cpu, Download, ShieldCheck,
  Target, Terminal, AlertTriangle
} from "lucide-react";

type GenerationState = "idle" | "loading" | "success";

const MODES = ["General", "Coding", "Writing", "Business", "Research"];
const LEVELS = ["Concise", "Balanced", "Detailed", "Comprehensive"];

const LOADING_PHRASES = [
  "Structuring role persona and domain context...",
  "Synthesizing explicit constraints and boundary rules...",
  "Calibrating output formatting and step-by-step logic...",
  "Finalizing model-optimized prompt template..."
];

const FAQS = [
  {
    question: "Why do structured prompts get significantly better results from AI?",
    answer: "Frontier LLMs like ChatGPT, Claude, and Gemini are probabilistic pattern matchers. When you give them vague instructions, they produce generic, average answers. By organizing instructions into explicit Roles, Step-by-Step Tasks, Strict Negative Constraints, and Formatted Output Schemas, you eliminate ambiguity and guide the model's attention heads to the exact quality level you need."
  },
  {
    question: "How do the different Optimization Modes work?",
    answer: "Each mode activates domain-specific prompt engineering frameworks. 'Coding' mode adds strict typing, architectural constraints, and error-handling requirements. 'Writing' mode calibrates voice, tone, and bans AI cliches (like 'delve' or 'tapestry'). 'Business' mode enforces actionable frameworks and executive summaries. 'Research' mode requires rigorous methodology, citations, and analytical neutrality."
  },
  {
    question: "What are 'Negative Constraints' and why does this tool include them?",
    answer: "Negative constraints tell the AI model what NOT to do (e.g. 'Do not use boilerplate prose', 'Do not assume external dependencies', 'Never fabricate sources'). Negative constraints are often more powerful than positive instructions because they prevent the most common failure modes and hallucinations."
  },
  {
    question: "Which AI models can I use these optimized prompts in?",
    answer: "The generated prompts are universally compatible with any AI platform or model, including OpenAI (ChatGPT, GPT-4o, o1), Anthropic (Claude 3.5 Sonnet / Opus), Google (Gemini 1.5 Pro / Flash), DeepSeek (V3 / R1), Mistral, and local models like Llama 3."
  },
  {
    question: "How does the Detail Level setting change the output?",
    answer: "'Concise' produces a tight, punchy prompt ideal for quick iterations and low token footprints. 'Balanced' includes standard context, guidelines, and constraints. 'Detailed' and 'Comprehensive' add few-shot reasoning steps, edge-case guards, and exhaustive output formatting specifications."
  }
];

export default function PromptOptimizerPage() {
  const [state, setState] = useState<GenerationState>("idle");
  const [input, setInput] = useState("");
  const [mode, setMode] = useState(MODES[0]);
  const [level, setLevel] = useState(LEVELS[1]);
  const [isModeOpen, setIsModeOpen] = useState(false);
  const [isLevelOpen, setIsLevelOpen] = useState(false);
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

  const handleOptimize = () => {
    if (!input.trim()) return;
    
    setState("loading");
    
    setTimeout(() => {
      setState("success");
    }, 2800);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateOptimizedPrompt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const fileBlob = new Blob([generateOptimizedPrompt()], { type: 'text/plain' });
    element.href = URL.createObjectURL(fileBlob);
    element.download = "optimized_prompt.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Generate customized prompt template based on mode and level
  const generateOptimizedPrompt = () => {
    const cleanInput = input.trim() || "Perform the requested objective with high accuracy.";

    if (mode === "Coding") {
      return `### ROLE\nYou are a Senior Staff Software Engineer and Technical Architect with deep expertise in clean, maintainable, and type-safe systems.\n\n### OBJECTIVE\n${cleanInput}\n\n### TECHNICAL REQUIREMENTS & ARCHITECTURE\n1. Write clean, idiomatic code adhering to modern standards and DRY principles.\n2. Implement robust error handling, defensive edge-case checking, and exhaustive type definitions.\n3. Prioritize high-performance patterns, modular composition, and readability.\n\n### NEGATIVE CONSTRAINTS\n- Do not output legacy syntax, deprecated APIs, or unnecessary external dependencies.\n- Avoid placeholder comments (e.g. "// implement here"); return fully functional, complete implementations.\n- Do not include conversational preambles or post-code pleasantries.\n\n### OUTPUT FORMAT\nProvide the complete code solution enclosed in a clean markdown code block, followed only by a concise bulleted list explaining architectural decisions and complexity trade-offs.`;
    }

    if (mode === "Writing") {
      return `### ROLE\nYou are an Elite Copywriter, Editor, and Communications Strategist known for crisp, compelling, and human-centric prose.\n\n### OBJECTIVE\n${cleanInput}\n\n### STYLE & TONE GUIDELINES\n- Tone: Authoritative, engaging, authentic, and direct.\n- Hook the reader immediately; eliminate boring introductions and generic filler.\n- Emphasize active verbs, concrete examples, and rhythm.\n\n### NEGATIVE CONSTRAINTS\n- Strictly ban generic AI cliches: Avoid words like "delve", "tapestry", "revolutionize", "beacon", "in conclusion", and "paramount".\n- Avoid passive voice, fluffy transitions, and repetitive adjectives.\n\n### OUTPUT STRUCTURE\nDeliver the finished copy formatted with clear headlines, bulleted highlights for scannability, and a clear call-to-action (CTA).`;
    }

    if (mode === "Business") {
      return `### ROLE\nYou are a Senior Executive Strategy Consultant and Operations Leader advising C-suite leadership.\n\n### OBJECTIVE\n${cleanInput}\n\n### FRAMEWORK & REQUIREMENTS\n1. Executive Summary: High-level synthesis of core insights and strategic impact.\n2. Strategic Breakdown: Structured analysis utilizing standard frameworks (ROI, Risk Mitigation, SWOT, KPI Drivers).\n3. Actionable Roadmap: Concrete, prioritized next steps with suggested milestone timelines and resource allocation.\n\n### NEGATIVE CONSTRAINTS\n- Do not provide vague, non-actionable advice or theoretical fluff.\n- Ensure all recommendations are quantifiable and practical for implementation.\n\n### OUTPUT FORMAT\nUse professional corporate memo format with bold section headers and key takeaway callout boxes.`;
    }

    if (mode === "Research") {
      return `### ROLE\nYou are a Principal Research Scientist and Subject-Matter Investigator committed to rigorous, evidence-based inquiry.\n\n### RESEARCH OBJECTIVE\n${cleanInput}\n\n### METHODOLOGY & STANDARDS\n1. Provide an objective, balanced synthesis of empirical data, historical precedents, and prevailing expert consensus.\n2. Explicitly distinguish between proven facts, consensus theories, and speculative hypotheses.\n3. Address counter-arguments, known limitations, and methodological blind spots.\n\n### NEGATIVE CONSTRAINTS\n- Avoid bias, emotional language, and unverified assumptions.\n- If certainty is low on a point, explicitly state the confidence level.\n\n### OUTPUT FORMAT\nStructure findings into Abstract, Key Mechanisms, Empirical Evidence, Limitations, and Analytical Synthesis.`;
    }

    // General Mode
    return `### ROLE & PERSONA\nYou are an expert specialist in this domain, providing precise, comprehensive, and actionable guidance.\n\n### OBJECTIVE & TASK\n${cleanInput}\n\n### EXECUTION GUIDELINES\n1. Break down complex steps logically and address edge-case considerations.\n2. Ensure all instructions are direct, practical, and immediately actionable.\n3. Maintain high clarity, precision, and structural rigor.\n\n### NEGATIVE CONSTRAINTS\n- Do not include conversational filler ("Sure, I can help with that!").\n- Avoid vague generalizations; ground answers in specific details.\n\n### OUTPUT FORMAT\nPresent the solution using clear Markdown headings, ordered steps, and bulleted takeaways.`;
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
          <div className="p-2.5 bg-primary/10 border border-primary/20 text-primary rounded-xl shrink-0">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Prompt Optimizer</h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Transform rough drafts and brain-dumps into structured, production-ready prompts tailored for ChatGPT, Claude, Gemini, and DeepSeek.
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
            <Settings2 className="w-4 h-4 text-primary" />
            Optimization Mode
          </div>
          
          <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

          {/* Mode Select */}
          <div className="relative">
            <button 
              onClick={() => setIsModeOpen(!isModeOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted transition-all shadow-sm"
            >
              Mode: <span className="text-foreground font-semibold">{mode}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            {isModeOpen && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-card border border-border rounded-xl shadow-xl z-30 py-1 overflow-hidden">
                {MODES.map(m => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setIsModeOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center justify-between ${
                      mode === m ? "text-primary font-bold bg-primary/5" : "text-foreground"
                    }`}
                  >
                    <span>{m}</span>
                    {mode === m && <Check className="w-3 h-3 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detail Level Select */}
          <div className="relative">
            <button 
              onClick={() => setIsLevelOpen(!isLevelOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted transition-all shadow-sm"
            >
              Detail: <span className="text-foreground font-semibold">{level}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            {isLevelOpen && (
              <div className="absolute top-full left-0 mt-1 w-44 bg-card border border-border rounded-xl shadow-xl z-30 py-1 overflow-hidden">
                {LEVELS.map(l => (
                  <button
                    key={l}
                    onClick={() => { setLevel(l); setIsLevelOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center justify-between ${
                      level === l ? "text-primary font-bold bg-primary/5" : "text-foreground"
                    }`}
                  >
                    <span>{l}</span>
                    {level === l && <Check className="w-3 h-3 text-primary" />}
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
            placeholder="Describe what you want the AI to do in plain English (e.g., 'I need a Python script to scrape product prices from an eCommerce page, handle rate limits, and output a CSV')..."
            className="w-full min-h-[220px] bg-transparent resize-y text-sm text-foreground placeholder:text-muted-foreground/45 dark:placeholder:text-muted-foreground/35 border-none focus:ring-0 p-0 leading-relaxed focus-visible:outline-none"
          />
        </div>

        {/* Action Footer */}
        <div className="px-5 md:px-6 py-4 border-t border-border bg-muted/10 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Estimated Prompt Size: <strong className="text-foreground">~{Math.max(1, Math.floor(input.length / 4)).toLocaleString()} tokens</strong></span>
          </div>

          <button
            onClick={handleOptimize}
            disabled={!input.trim() || state === "loading"}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {state === "loading" ? (
              <>
                <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                Optimizing Prompt...
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                Optimize Prompt
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
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Sparkles className="w-6 h-6 animate-spin" />
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
              <p className="text-xs text-muted-foreground mb-6">Structuring domain context, negative constraints, and output schema...</p>

              <div className="flex justify-center gap-1.5 max-w-xs mx-auto">
                {LOADING_PHRASES.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      idx <= loadingStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Success Output Card */}
          {state === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="px-5 py-4 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 text-sm font-bold text-foreground">
                  <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span>Production-Ready Prompt</span>
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      ({mode} Mode • {level} Detail)
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
                        Copy Prompt
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Download as .txt"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-5 md:p-6 bg-muted/10 font-mono text-xs leading-relaxed text-foreground overflow-x-auto whitespace-pre-wrap max-h-[420px]">
                {generateOptimizedPrompt()}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* 4. Comprehensive Explanatory Guide & SEO Knowledge Section */}
      <section className="border-t border-border pt-12 space-y-12 text-foreground">
        
        {/* Section 1: Overview / Why Prompt Optimization Works */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Prompt Engineering & Instruction Design
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            How Prompt Optimizer Transforms Your Rough Ideas into Perfect AI Results
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            When interacting with frontier AI tools like <strong>ChatGPT</strong>, <strong>Claude</strong>, or <strong>Gemini</strong>, the quality of your output is fundamentally bounded by the structural clarity of your input. Typing casual, one-sentence requests often leads to vague, generic answers, missing code edge-cases, and endless back-and-forth re-prompting.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong>Prompt Optimizer</strong> solves this instantly. Simply paste your raw idea into the studio above, select your desired mode (Coding, Writing, Business, Research, or General), and our optimization engine automatically compiles your request into an authoritative, structured instruction set designed to extract the highest reasoning performance from your AI on the very first try.
          </p>
        </div>

        {/* Section 2: 5 Specialized Modes */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-foreground">5 Tailored Optimization Modes for Every Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                <Code2 className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-sm text-foreground">Coding & Software Architecture</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enforces strict type safety, modular design patterns, comprehensive error handling, and eliminates lazy &ldquo;// implement later&rdquo; placeholders.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-sm text-foreground">Writing & Copywriting</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Calibrates tone of voice, enforces strong narrative hooks, and strictly bans repetitive AI cliches like &ldquo;delve&rdquo;, &ldquo;tapestry&rdquo;, and &ldquo;beacon&rdquo;.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                <Target className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-sm text-foreground">Business & Strategy</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Formats prompts around actionable executive frameworks (SWOT, ROI, Risk Assessment) to produce executive-ready memos and strategic roadmaps.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                <BookOpen className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-sm text-foreground">Academic & Research</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Requires empirical evidence, transparent confidence ratings, balanced counter-arguments, and structured analytical methodology.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2 md:col-span-2 lg:col-span-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-sm text-foreground">General & Daily Productivity</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The all-around optimizer for transforming brainstorms, planning sessions, and everyday workflows into clear, unambiguous directions for your AI assistant.
              </p>
            </div>

          </div>
        </div>

        {/* Section 3: Anatomy of a Great Prompt */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-foreground">Anatomy of a High-Performing AI Prompt</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every prompt generated by our Prompt Optimizer includes the 4 foundational pillars of professional prompt engineering:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="font-bold text-primary block mb-1">1. Role & Persona Anchoring</span>
              <p className="text-muted-foreground leading-relaxed">
                Positions the model as a top-tier domain specialist, calibrating its vocabulary and internal reasoning weights.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="font-bold text-primary block mb-1">2. Explicit Task Execution Steps</span>
              <p className="text-muted-foreground leading-relaxed">
                Breaks down your request into sequential, unambiguous instructions that prevent the AI from skipping critical steps.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="font-bold text-primary block mb-1">3. Strict Negative Constraints</span>
              <p className="text-muted-foreground leading-relaxed">
                Explicitly bans unwanted behaviors, hallucinated claims, outdated libraries, and generic filler phrases.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="font-bold text-primary block mb-1">4. Output Schema & Format Rules</span>
              <p className="text-muted-foreground leading-relaxed">
                Dictates the exact visual layout (Markdown, JSON, tables) so the response is immediately copy-paste ready for your workflow.
              </p>
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
            "name": "Prompt Optimizer",
            "operatingSystem": "All",
            "applicationCategory": "DeveloperApplication",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "description": "Transform vague instructions into structured, production-ready prompts tailored for any frontier LLM.",
            "featureList": [
              "Multi-mode optimization (Coding, Writing, Business, Research, General)",
              "Automatic negative constraint synthesis",
              "Role persona anchoring",
              "Instant one-click copy for ChatGPT, Claude, and Gemini"
            ]
          })
        }}
      />

    </article>
  );
}
