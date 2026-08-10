"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRightLeft, FileCode, Check, 
  Settings2, ArrowRight
} from "lucide-react";
import { PromptComparison } from "@/components/tools/PromptComparison";

type GenerationState = "idle" | "loading" | "success";

const LOADING_PHRASES = [
  "Calculating token diffs...",
  "Running cost estimation heuristics...",
  "Formatting side-by-side comparison...",
  "Finalizing report..."
];

export default function CompareEstimatePage() {
  const [state, setState] = useState<GenerationState>("idle");
  const [basePrompt, setBasePrompt] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  
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

  const handleCompare = () => {
    if (!basePrompt.trim() && !newPrompt.trim()) return;
    
    setState("loading");
    
    setTimeout(() => {
      setState("success");
    }, 2800);
  };

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto px-6 py-8">
      
      {/* 1. Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 border border-primary/20 text-primary rounded-xl shrink-0">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Diff & Cost Estimate</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Compare your original prompt with the optimized version to visualize exactly what changed and how much you are saving on API costs.
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
        <div className="px-5 py-3 border-b border-border/40 bg-muted/20 flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Settings2 className="w-4 h-4" />
            Comparison Inputs
          </div>
        </div>

        {/* Split Text Area */}
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border/40 bg-transparent">
          {/* Base Prompt */}
          <div className="flex-1 p-5 relative">
            <div className="absolute top-4 right-4 px-2 py-1 bg-muted rounded text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Base</div>
            <textarea
              value={basePrompt}
              onChange={(e) => setBasePrompt(e.target.value)}
              placeholder="Paste your original prompt here..."
              className="w-full min-h-[220px] bg-transparent resize-y text-sm text-foreground placeholder:text-muted-foreground/60 border-none focus:ring-0 p-0 leading-relaxed focus-visible:outline-none"
            />
          </div>
          
          {/* New Prompt */}
          <div className="flex-1 p-5 relative bg-muted/5">
            <div className="absolute top-4 right-4 px-2 py-1 bg-primary/10 text-primary rounded text-[10px] font-bold uppercase tracking-wider">Optimized</div>
            <textarea
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="Paste your optimized or new prompt here..."
              className="w-full min-h-[220px] bg-transparent resize-y text-sm text-foreground placeholder:text-muted-foreground/60 border-none focus:ring-0 p-0 leading-relaxed focus-visible:outline-none"
            />
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-5 py-4 border-t border-border/40 bg-muted/10 flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-primary" />
            Ready for side-by-side analysis
          </div>

          <button
            onClick={handleCompare}
            disabled={(!basePrompt.trim() && !newPrompt.trim()) || state === "loading"}
            className="relative overflow-hidden group flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-[0_0_20px_rgba(var(--primary),0.2)] hover:shadow-[0_0_25px_rgba(var(--primary),0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
          >
            {state === "loading" ? (
              <>
                <ArrowRightLeft className="w-4 h-4 animate-spin-slow" />
                Comparing...
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                Compare Prompts
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
                <ArrowRightLeft className="w-5 h-5 text-primary animate-pulse" />
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
              </div>
            </motion.div>
          )}

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
      
    </div>
  );
}
