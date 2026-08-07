"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Terminal, Copy, Check, ChevronDown, 
  Settings2, FileCode2, Save, AlignLeft, Paintbrush
} from "lucide-react";

type GenerationState = "idle" | "loading" | "success";

const FORMAT_STYLES = ["Markdown (Standard)", "JSON (API Use)", "XML (Claude Specific)"];
const INDENT_SIZES = ["2 Spaces", "4 Spaces", "Tabs"];

const LOADING_PHRASES = [
  "Parsing raw text input...",
  "Applying semantic structure...",
  "Standardising headings and lists...",
  "Generating clean output..."
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

  const handleFormat = () => {
    if (!input.trim()) return;
    
    setState("loading");
    
    setTimeout(() => {
      setState("success");
    }, 2800);
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-6 py-8">
      
      {/* 1. Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 rounded-xl shrink-0">
            <Terminal className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Prompt Formatter</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Clean up, structure, and standardise messy prompts automatically for better readability and model comprehension.
        </p>
      </motion.div>

      {/* 2. Editor Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-card border border-border/60 shadow-sm rounded-2xl overflow-hidden flex flex-col mb-8 transition-shadow hover:shadow-md"
      >
        
        {/* Settings Bar */}
        <div className="px-5 py-3 border-b border-border/40 bg-muted/20 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Settings2 className="w-4 h-4" />
            Format Settings
          </div>
          
          <div className="h-4 w-px bg-border/60 mx-1 hidden sm:block" />

          {/* Format Style Select */}
          <div className="relative">
            <button 
              onClick={() => setIsFormatOpen(!isFormatOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted hover:border-foreground/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Output: <span className="text-foreground">{format}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            {isFormatOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                {FORMAT_STYLES.map(f => (
                  <button
                    key={f}
                    onClick={() => { setFormat(f); setIsFormatOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors text-foreground"
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Indent Size Select */}
          <div className="relative">
            <button 
              onClick={() => setIsIndentOpen(!isIndentOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted hover:border-foreground/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Indentation: <span className="text-foreground">{indent}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            {isIndentOpen && (
              <div className="absolute top-full left-0 mt-1 w-32 bg-card border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                {INDENT_SIZES.map(i => (
                  <button
                    key={i}
                    onClick={() => { setIndent(i); setIsIndentOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors text-foreground"
                  >
                    {i}
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
            placeholder="Paste your unformatted, messy prompt here to instantly structure it..."
            className="w-full min-h-[220px] bg-transparent resize-y text-sm text-foreground placeholder:text-muted-foreground/60 border-none focus:ring-0 p-0 leading-relaxed focus-visible:outline-none"
          />
        </div>

        {/* Action Footer */}
        <div className="px-5 py-4 border-t border-border/40 bg-muted/10 flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <AlignLeft className="w-3.5 h-3.5 text-cyan-500" />
            Ready to format
          </div>

          <button
            onClick={handleFormat}
            disabled={!input.trim() || state === "loading"}
            className="relative overflow-hidden group flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-bold shadow-[0_0_20px_rgba(8,145,178,0.2)] hover:shadow-[0_0_25px_rgba(8,145,178,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-[0_0_20px_rgba(8,145,178,0.2)]"
          >
            {state === "loading" ? (
              <>
                <Paintbrush className="w-4 h-4 animate-spin-slow" />
                Formatting...
              </>
            ) : (
              <>
                <Paintbrush className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                Format Prompt
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* 3. Output Container (Dynamic) */}
      <div ref={outputRef} className="scroll-mt-24">
        <AnimatePresence mode="wait">
          {state === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm mt-4"
            >
              <div className="flex items-center gap-3 mb-6">
                <Paintbrush className="w-5 h-5 text-cyan-500 animate-pulse" />
                <AnimatePresence mode="wait">
                  <motion.h3 
                    key={loadingStep}
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    transition={{ duration: 0.2 }}
                    className="font-semibold text-sm"
                  >
                    {LOADING_PHRASES[loadingStep]}
                  </motion.h3>
                </AnimatePresence>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-muted/60 rounded-md w-3/4 animate-pulse" />
                <div className="h-4 bg-muted/60 rounded-md w-full animate-pulse" />
                <div className="h-4 bg-muted/60 rounded-md w-5/6 animate-pulse" />
                <div className="h-4 bg-muted/60 rounded-md w-1/2 animate-pulse" />
              </div>
            </motion.div>
          )}

          {state === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-cyan-500/20 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(8,145,178,0.05)] mt-4"
            >
              <div className="px-5 py-4 border-b border-border/40 bg-cyan-500/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <FileCode2 className="w-4 h-4 text-cyan-500" />
                  Structured Output
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Save className="w-3.5 h-3.5" />
                    Save
                  </button>
                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-background border border-border text-foreground hover:bg-muted transition-colors shadow-sm"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-5 bg-muted/10 font-mono text-[13px] leading-relaxed text-muted-foreground overflow-x-auto">
                <span className="text-cyan-500 font-bold"># SYSTEM</span><br/>
                You are a helpful AI assistant.<br/><br/>
                
                <span className="text-cyan-500 font-bold"># INSTRUCTION</span><br/>
                {input || "Please summarize the following text."}<br/><br/>
                
                <span className="text-cyan-500 font-bold"># FORMATTING</span><br/>
                - Ensure the output is concise.<br/>
                - Use bullet points for readability.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
    </div>
  );
}
