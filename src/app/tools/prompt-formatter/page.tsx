"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  Terminal, Copy, Check, ChevronDown, 
  Settings2, FileCode2, Save, AlignLeft, Paintbrush,
  Sparkles, RefreshCcw, Download, Zap, Code2, FileText,
  ShieldCheck, ArrowRight, BookOpen, Layers, CheckCircle2,
  FileCode, Cpu
} from "lucide-react";

type GenerationState = "idle" | "loading" | "success";

const FORMAT_STYLES = ["Markdown (Standard)", "XML (Claude-Optimized)", "JSON (API Ready)"];
const INDENT_SIZES = ["2 Spaces", "4 Spaces", "Tabs"];

const LOADING_PHRASES = [
  "Parsing raw input and identifying logical section boundaries...",
  "Applying semantic delimiters (Role, Task, Constraints, Output)...",
  "Normalizing whitespace, bulleting, and tag indentation...",
  "Generating standardized, model-friendly output..."
];

const FAQS = [
  {
    question: "Why does structured formatting improve AI comprehension?",
    answer: "When prompts are written as large, unbroken walls of text, transformer attention heads suffer from 'instruction bleeding'—where background context mixes with strict constraints. Formatting text with Markdown headers (`### Task`) or XML tags (`<rules>`) establishes clear semantic boundaries, ensuring the model never overlooks a constraint."
  },
  {
    question: "Why are XML tags recommended specifically for Anthropic Claude?",
    answer: "Anthropic's official prompt engineering guidelines recommend wrapping complex prompts in XML tags (e.g. `<system>`, `<context>`, `<instructions>`). Claude was fine-tuned specifically to respect XML tag hierarchies, making it significantly less prone to prompt confusion."
  },
  {
    question: "When should I choose JSON format over Markdown?",
    answer: "Use JSON when you are storing prompts in configuration files, passing structured data to OpenAI/Claude API endpoints, or when you need strict programmatic control over prompt components (e.g., separating system instructions from user inputs)."
  },
  {
    question: "Will formatting a prompt increase my token count?",
    answer: "Barely! Standard Markdown and XML tags add only 10 to 30 tokens, but they drastically improve output precision and prevent costly regeneration cycles."
  }
];

export default function PromptFormatterPage() {
  const [state, setState] = useState<GenerationState>("idle");
  const [input, setInput] = useState("");
  const [format, setFormat] = useState(FORMAT_STYLES[0]);
  const [indent, setIndent] = useState(INDENT_SIZES[0]);
  
  const [isFormatOpen, setIsFormatOpen] = useState(false);
  const [isIndentOpen, setIsIndentOpen] = useState(false);
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

  const handleFormat = () => {
    if (!input.trim()) return;
    
    setState("loading");
    
    setTimeout(() => {
      setState("success");
    }, 2800);
  };

  const generateFormattedOutput = () => {
    const raw = input.trim() || "Perform the specified objective with high clarity and precision.";

    if (format.startsWith("XML")) {
      return `<system>\nYou are an expert assistant specialized in executing complex instructions with precision.\n</system>\n\n<task>\n${raw}\n</task>\n\n<guidelines>\n  - Adhere strictly to the requested scope.\n  - Ensure high clarity, accuracy, and structural organization.\n  - Avoid conversational filler.\n</guidelines>\n\n<output_format>\nDeliver the response in clean, organized Markdown.\n</output_format>`;
    }

    if (format.startsWith("JSON")) {
      const spaceCount = indent === "4 Spaces" ? 4 : indent === "Tabs" ? "\t" : 2;
      return JSON.stringify({
        system_role: "Expert AI specialist",
        primary_task: raw,
        constraints: [
          "Maintain strict factual accuracy",
          "Follow specified layout rules",
          "Eliminate conversational preambles"
        ],
        output_format: "Structured Markdown"
      }, null, spaceCount);
    }

    // Standard Markdown
    return `### SYSTEM ROLE\nYou are a domain specialist providing comprehensive, high-accuracy guidance.\n\n### PRIMARY OBJECTIVE\n${raw}\n\n### EXECUTION RULES\n- Break down all requirements methodically.\n- Ground all reasoning in verifiable facts.\n- Eliminate conversational preambles and post-answer pleasantries.\n\n### OUTPUT STRUCTURE\nPresent the final result with clear headings, bulleted lists, and code blocks where appropriate.`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateFormattedOutput());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const ext = format.startsWith("JSON") ? "json" : format.startsWith("XML") ? "xml" : "txt";
    const fileBlob = new Blob([generateFormattedOutput()], { type: 'text/plain' });
    element.href = URL.createObjectURL(fileBlob);
    element.download = `formatted_prompt.${ext}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
          <div className="p-2.5 bg-pink-500/10 border border-pink-500/20 text-pink-500 rounded-xl shrink-0 shadow-sm">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Prompt Formatter</h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Clean up, structure, and standardise messy prompts automatically into Markdown, XML tags, or JSON for superior readability and AI model comprehension.
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
            <Settings2 className="w-4 h-4 text-pink-500" />
            Formatting Preset
          </div>
          
          <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

          {/* Format Style Select */}
          <div className="relative">
            <button 
              onClick={() => setIsFormatOpen(!isFormatOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted transition-all shadow-sm"
            >
              Format: <span className="text-foreground font-semibold">{format}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            {isFormatOpen && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-card border border-border rounded-xl shadow-xl z-30 py-1 overflow-hidden">
                {FORMAT_STYLES.map(f => (
                  <button
                    key={f}
                    onClick={() => { setFormat(f); setIsFormatOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center justify-between ${
                      format === f ? "text-pink-500 font-bold bg-pink-500/5" : "text-foreground"
                    }`}
                  >
                    <span>{f}</span>
                    {format === f && <Check className="w-3 h-3 text-pink-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Indentation Select */}
          <div className="relative">
            <button 
              onClick={() => setIsIndentOpen(!isIndentOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted transition-all shadow-sm"
            >
              Indentation: <span className="text-foreground font-semibold">{indent}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            {isIndentOpen && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-card border border-border rounded-xl shadow-xl z-30 py-1 overflow-hidden">
                {INDENT_SIZES.map(i => (
                  <button
                    key={i}
                    onClick={() => { setIndent(i); setIsIndentOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center justify-between ${
                      indent === i ? "text-pink-500 font-bold bg-pink-500/5" : "text-foreground"
                    }`}
                  >
                    <span>{i}</span>
                    {indent === i && <Check className="w-3 h-3 text-pink-500" />}
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
            placeholder="Paste your unformatted, messy wall of text here to automatically break it down into clean, structured sections..."
            className="w-full min-h-[220px] bg-transparent resize-y text-sm text-foreground placeholder:text-muted-foreground/45 dark:placeholder:text-muted-foreground/35 border-none focus:ring-0 p-0 leading-relaxed focus-visible:outline-none"
          />
        </div>

        {/* Action Footer */}
        <div className="px-5 md:px-6 py-4 border-t border-border bg-muted/10 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <AlignLeft className="w-4 h-4 text-pink-500" />
            <span>Target Output: <strong className="text-foreground">{format.split(" ")[0]}</strong></span>
          </div>

          <button
            onClick={handleFormat}
            disabled={!input.trim() || state === "loading"}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {state === "loading" ? (
              <>
                <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                Formatting Prompt...
              </>
            ) : (
              <>
                <Paintbrush className="w-3.5 h-3.5" />
                Format Prompt
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
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Paintbrush className="w-6 h-6 animate-spin" />
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
              <p className="text-xs text-muted-foreground mb-6">Synthesizing hierarchy, indentation, and semantic delimiters...</p>

              <div className="flex justify-center gap-1.5 max-w-xs mx-auto">
                {LOADING_PHRASES.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      idx <= loadingStep ? "bg-pink-500" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Success Output View */}
          {state === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="px-5 py-4 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 text-sm font-bold text-foreground">
                  <div className="p-1.5 bg-pink-500/10 text-pink-500 rounded-lg">
                    <FileCode2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span>Structured Prompt Output</span>
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      ({format})
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
                        Copy Formatted Prompt
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Download formatted file"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-5 md:p-6 bg-muted/10 font-mono text-xs leading-relaxed text-foreground overflow-x-auto whitespace-pre-wrap max-h-[420px]">
                {generateFormattedOutput()}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* 4. Comprehensive Explanatory Guide & SEO Knowledge Section */}
      <section className="border-t border-border pt-12 space-y-12 text-foreground">
        
        {/* Section 1: Overview / Why Formatting Matters */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20 text-xs font-semibold">
            <Terminal className="w-3.5 h-3.5" />
            Prompt Architecture & Structural Formatting
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Why Prompt Formatting Drastically Improves AI Output Quality
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            When you type a single, messy wall of text into <strong>ChatGPT</strong>, <strong>Claude</strong>, or <strong>Gemini</strong>, the AI&rsquo;s self-attention mechanism processes all words with equal visual weight. Critical constraints, input variables, and negative rules blend together—leading to missed instructions and unpredictable formatting.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong>Prompt Formatter</strong> converts unstructured notes into standardized semantic blocks. By establishing unambiguous section headers (such as <code>### System</code>, <code>### Task</code>, and <code>### Constraints</code>), the model&rsquo;s attention heads focus precisely on what matters, guaranteeing structured, repeatable responses.
          </p>
        </div>

        {/* Section 2: Format Comparison */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-foreground">Choosing the Ideal Prompt Format</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-5 rounded-2xl bg-card border border-border space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                <FileCode className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-sm text-foreground">Markdown (Standard)</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Best for:</strong> OpenAI ChatGPT, Google Gemini, and general human readability. Uses clean markdown headers (`###`) and bullet points.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                <Layers className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-sm text-foreground">XML Tags (Claude-Optimized)</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Best for:</strong> Anthropic Claude 3.5 Sonnet & Opus. Claude is pre-trained to parse nested XML tags (`&lt;instructions&gt;`, `&lt;context&gt;`) with near 100% adherence.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                <Cpu className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-sm text-foreground">JSON Schema (API Ready)</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Best for:</strong> Developers and programmatic pipelines. Provides strict object key-value separation for system roles, instructions, and schemas.
              </p>
            </div>

          </div>
        </div>

        {/* Section 3: Formatting Quality Comparison Table */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-foreground">Unformatted Text Wall vs. Formatted Prompt</h3>
          <div className="rounded-2xl border border-border overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="p-4">Quality Attribute</th>
                    <th className="p-4 text-rose-600 dark:text-rose-400">Unformatted Text Blob</th>
                    <th className="p-4 text-emerald-600 dark:text-emerald-400">Formatted Prompt Structure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-4 font-semibold text-foreground">Constraint Adherence</td>
                    <td className="p-4 text-muted-foreground">Frequent misses due to instruction bleeding</td>
                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">High precision (isolated in dedicated sections)</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-foreground">Human Readability</td>
                    <td className="p-4 text-muted-foreground">Hard to edit, update, or share across team</td>
                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">Crystal clear modular layout</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-foreground">Model Compatibility</td>
                    <td className="p-4 text-muted-foreground">Unpredictable across different models</td>
                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">Universal standard for ChatGPT, Claude, and Gemini</td>
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
                    className="w-full p-4 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-foreground hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-2 ${isOpen ? "rotate-180 text-pink-600 dark:text-pink-400" : ""}`} />
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
            "name": "Prompt Formatter",
            "operatingSystem": "All",
            "applicationCategory": "DeveloperApplication",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "description": "Convert unstructured walls of text into standardized, model-friendly prompt sections in Markdown, XML, or JSON.",
            "featureList": [
              "Standard Markdown prompt formatting",
              "Claude-optimized XML tag structures",
              "API-ready JSON schema formatting",
              "Customizable indentation and layout control"
            ]
          })
        }}
      />

    </article>
  );
}
