"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, Copy, Check, ChevronDown, 
  Settings2, Target, BrainCircuit, BarChart3, TrendingUp
} from "lucide-react";

type GenerationState = "idle" | "loading" | "success";

const SCORING_MODELS = ["Standard (General)", "Strict (Production)", "Creative"];
const TARGET_LLMS = ["Any Model", "GPT-4 Optimization", "Claude 3 Optimization"];

const LOADING_PHRASES = [
  "Analyzing semantic clarity...",
  "Evaluating constraint precision...",
  "Calculating contextual density...",
  "Computing final intelligence score..."
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
    }, 3200);
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
          <div className="p-2 bg-violet-500/10 border border-violet-500/20 text-violet-500 rounded-xl shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Intelligence Score</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Grade the clarity, structure, and overall effectiveness of your prompt before you send it to the model.
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
            Analysis Settings
          </div>
          
          <div className="h-4 w-px bg-border/60 mx-1 hidden sm:block" />

          {/* Scoring Model Select */}
          <div className="relative">
            <button 
              onClick={() => setIsModelOpen(!isModelOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted hover:border-foreground/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Model: <span className="text-foreground">{model}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            {isModelOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                {SCORING_MODELS.map(m => (
                  <button
                    key={m}
                    onClick={() => { setModel(m); setIsModelOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors text-foreground"
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Target LLM Select */}
          <div className="relative">
            <button 
              onClick={() => setIsTargetOpen(!isTargetOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted hover:border-foreground/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Target: <span className="text-foreground">{target}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            {isTargetOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                {TARGET_LLMS.map(t => (
                  <button
                    key={t}
                    onClick={() => { setTarget(t); setIsTargetOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors text-foreground"
                  >
                    {t}
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
            placeholder="Paste your prompt here to evaluate its intelligence score..."
            className="w-full min-h-[220px] bg-transparent resize-y text-sm text-foreground placeholder:text-muted-foreground/60 border-none focus:ring-0 p-0 leading-relaxed focus-visible:outline-none"
          />
        </div>

        {/* Action Footer */}
        <div className="px-5 py-4 border-t border-border/40 bg-muted/10 flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <BrainCircuit className="w-3.5 h-3.5 text-violet-500" />
            AI heuristics loaded
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!input.trim() || state === "loading"}
            className="relative overflow-hidden group flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold shadow-[0_0_20px_rgba(124,58,237,0.2)] hover:shadow-[0_0_25px_rgba(124,58,237,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-[0_0_20px_rgba(124,58,237,0.2)]"
          >
            {state === "loading" ? (
              <>
                <Activity className="w-4 h-4 animate-spin-slow" />
                Analyzing...
              </>
            ) : (
              <>
                <Target className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Analyze Prompt
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
                <Activity className="w-5 h-5 text-violet-500 animate-pulse" />
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
              className="bg-card border border-violet-500/20 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(124,58,237,0.05)] mt-4"
            >
              <div className="px-5 py-4 border-b border-border/40 bg-violet-500/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <BarChart3 className="w-4 h-4 text-violet-500" />
                  Analysis Report
                </div>
              </div>

              <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center md:items-start">
                
                {/* Large Score Circle */}
                <div className="flex-shrink-0 flex flex-col items-center justify-center w-36 h-36 rounded-full border-[6px] border-violet-500/20 relative">
                  <div className="absolute inset-0 rounded-full border-[6px] border-violet-500 rounded-full border-t-transparent border-r-transparent transform -rotate-45"></div>
                  <span className="text-4xl font-black text-foreground">78</span>
                  <span className="text-xs font-medium text-muted-foreground mt-1 tracking-widest uppercase">Score</span>
                </div>
                
                {/* Metrics */}
                <div className="flex-1 w-full space-y-6">
                  
                  {/* Metric 1 */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">Clarity</span>
                      <span className="text-xs font-medium text-muted-foreground">85 / 100</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: "85%" }} 
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-emerald-500 rounded-full" 
                      />
                    </div>
                  </div>

                  {/* Metric 2 */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">Precision</span>
                      <span className="text-xs font-medium text-muted-foreground">60 / 100</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: "60%" }} 
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-amber-500 rounded-full" 
                      />
                    </div>
                  </div>

                  {/* Metric 3 */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">Contextual Density</span>
                      <span className="text-xs font-medium text-muted-foreground">90 / 100</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: "90%" }} 
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-emerald-500 rounded-full" 
                      />
                    </div>
                  </div>

                </div>
              </div>
              
              <div className="bg-muted/10 p-5 border-t border-border/40">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-violet-500" />
                  Key Insights
                </h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 font-black">•</span>
                    Your precision score is low. Try explicitly stating the required output format (e.g. JSON, markdown).
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-black">•</span>
                    Excellent contextual density! The model has enough background information to ground its response.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-violet-500 font-black">•</span>
                    Consider using the Prompt Formatter to cleanly separate your instructions from your context.
                  </li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
    </div>
  );
}
