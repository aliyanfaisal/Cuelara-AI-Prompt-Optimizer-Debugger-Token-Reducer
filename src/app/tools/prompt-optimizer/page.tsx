"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wand2, Code2, Copy, Check, ChevronDown, 
  Settings2, Sparkles, RefreshCcw, Save, Zap
} from "lucide-react";

type GenerationState = "idle" | "loading" | "success";

const MODES = ["General", "Coding", "Writing", "Business", "Research"];
const LEVELS = ["Concise", "Balanced", "Detailed", "Comprehensive"];

const LOADING_PHRASES = [
  "Structuring your prompt...",
  "Analyzing constraints and variables...",
  "Applying industry best practices...",
  "Finalizing optimized output..."
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
      }, 50); // slight delay to ensure render
    }
  }, [state]);

  const handleOptimize = () => {
    if (!input.trim()) return;
    
    setState("loading");
    
    // Simulate API delay
    setTimeout(() => {
      setState("success");
    }, 3000);
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
          <div className="p-2 bg-primary/10 border border-primary/20 text-primary rounded-xl shrink-0">
            <Code2 className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Prompt Optimizer</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Transform vague brain-dumps into precisely structured, professional prompts tailored for any frontier LLM.
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
            Configuration
          </div>
          
          <div className="h-4 w-px bg-border/60 mx-1 hidden sm:block" />

          {/* Mode Select (Mock) */}
          <div className="relative">
            <button 
              onClick={() => setIsModeOpen(!isModeOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted hover:border-foreground/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Mode: <span className="text-foreground">{mode}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            {isModeOpen && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-card border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                {MODES.map(m => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setIsModeOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors text-foreground"
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Level Select (Mock) */}
          <div className="relative">
            <button 
              onClick={() => setIsLevelOpen(!isLevelOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted hover:border-foreground/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Detail: <span className="text-foreground">{level}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            {isLevelOpen && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-card border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                {LEVELS.map(l => (
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
        </div>

        {/* Text Area */}
        <div className="relative p-5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what you want the AI to do in plain English..."
            className="w-full min-h-[220px] bg-transparent resize-y text-sm text-foreground placeholder:text-muted-foreground/60 border-none focus:ring-0 p-0 leading-relaxed focus-visible:outline-none"
          />
        </div>

        {/* Action Footer */}
        <div className="px-5 py-4 border-t border-border/40 bg-muted/10 flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Uses approx. 12 tokens
          </div>

          <button
            onClick={handleOptimize}
            disabled={!input.trim() || state === "loading"}
            className="relative overflow-hidden group flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:shadow-[0_0_25px_rgba(79,70,229,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-[0_0_20px_rgba(79,70,229,0.2)]"
          >
            {state === "loading" ? (
              <>
                <RefreshCcw className="w-4 h-4 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                Optimize Prompt
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
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
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
            className="bg-card border border-primary/20 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(79,70,229,0.1)] mt-4"
          >
            <div className="px-5 py-4 border-b border-border/40 bg-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Sparkles className="w-4 h-4 text-primary" />
                Optimized Output
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
              <span className="text-primary font-bold"># ROLE</span><br/>
              You are an expert software engineer specializing in React and Next.js.<br/><br/>
              
              <span className="text-primary font-bold"># TASK</span><br/>
              {input || "Implement a high-performance web application."}<br/><br/>
              
              <span className="text-primary font-bold"># CONSTRAINTS</span><br/>
              - Use TypeScript strictly.<br/>
              - Implement Tailwind CSS for styling.<br/>
              - Ensure mobile responsiveness.<br/><br/>
              
              <span className="text-primary font-bold"># OUTPUT FORMAT</span><br/>
              Return only the raw code block. No explanations.
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
      
    </div>
  );
}
