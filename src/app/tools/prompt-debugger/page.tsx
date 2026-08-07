"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, Copy, Check, ChevronDown, 
  Settings2, Bug, AlertTriangle, CheckCircle2, ShieldAlert
} from "lucide-react";

type GenerationState = "idle" | "loading" | "success";

const STRICTNESS_LEVELS = ["Standard", "High", "Paranoid"];
const FOCUS_AREAS = ["All Vulnerabilities", "Logic Loopholes", "Edge-cases", "Bias & Tone"];

const LOADING_PHRASES = [
  "Scanning for logical inconsistencies...",
  "Analyzing edge-case vulnerabilities...",
  "Checking against known jailbreak patterns...",
  "Compiling debug report..."
];

export default function PromptDebuggerPage() {
  const [state, setState] = useState<GenerationState>("idle");
  const [input, setInput] = useState("");
  const [level, setLevel] = useState(STRICTNESS_LEVELS[1]);
  const [focus, setFocus] = useState(FOCUS_AREAS[0]);
  
  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const [isFocusOpen, setIsFocusOpen] = useState(false);
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

  const handleDebug = () => {
    if (!input.trim()) return;
    
    setState("loading");
    
    // Simulate API delay
    setTimeout(() => {
      setState("success");
    }, 3000);
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
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Prompt Debugger</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Identify logical loopholes, bias, and edge-cases before you deploy your prompt to production.
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
            Scanner Settings
          </div>
          
          <div className="h-4 w-px bg-border/60 mx-1 hidden sm:block" />

          {/* Strictness Level Select */}
          <div className="relative">
            <button 
              onClick={() => setIsLevelOpen(!isLevelOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted hover:border-foreground/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Strictness: <span className="text-foreground">{level}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            {isLevelOpen && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-card border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                {STRICTNESS_LEVELS.map(l => (
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

          {/* Focus Area Select */}
          <div className="relative">
            <button 
              onClick={() => setIsFocusOpen(!isFocusOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted hover:border-foreground/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Focus: <span className="text-foreground">{focus}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            {isFocusOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                {FOCUS_AREAS.map(f => (
                  <button
                    key={f}
                    onClick={() => { setFocus(f); setIsFocusOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors text-foreground"
                  >
                    {f}
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
            placeholder="Paste your prompt here to scan for vulnerabilities, logical gaps, and missing constraints..."
            className="w-full min-h-[220px] bg-transparent resize-y text-sm text-foreground placeholder:text-muted-foreground/60 border-none focus:ring-0 p-0 leading-relaxed focus-visible:outline-none"
          />
        </div>

        {/* Action Footer */}
        <div className="px-5 py-4 border-t border-border/40 bg-muted/10 flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Ready for security analysis
          </div>

          <button
            onClick={handleDebug}
            disabled={!input.trim() || state === "loading"}
            className="relative overflow-hidden group flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-[0_0_20px_rgba(5,150,105,0.2)] hover:shadow-[0_0_25px_rgba(5,150,105,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-[0_0_20px_rgba(5,150,105,0.2)]"
          >
            {state === "loading" ? (
              <>
                <Bug className="w-4 h-4 animate-bounce" />
                Scanning...
              </>
            ) : (
              <>
                <Bug className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:rotate-12 transition-all" />
                Debug Prompt
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
                <Bug className="w-5 h-5 text-emerald-500 animate-pulse" />
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
              className="bg-card border border-emerald-500/20 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(5,150,105,0.05)] mt-4"
            >
              {/* Report Header */}
              <div className="px-5 py-4 border-b border-border/40 bg-emerald-500/5 flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm font-bold text-foreground">
                  <div className="p-1.5 bg-rose-500/20 text-rose-500 rounded-md">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-rose-500">2 Vulnerabilities Found</span>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                
                {/* Issue 1 */}
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-colors">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-rose-500 mb-1">Missing Output Constraints</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Your prompt asks for a summary but does not strictly dictate the format (e.g., JSON, markdown). This can lead to unpredictable parsing errors in production.
                      </p>
                      <div className="mt-3 bg-background border border-border rounded-lg p-3 text-xs font-mono text-emerald-500">
                        <span className="text-muted-foreground select-none">Fix: </span>
                        "Return the final output STRICTLY as a valid JSON object with the keys 'summary' and 'key_points'. Do not include any other text."
                      </div>
                    </div>
                  </div>
                </div>

                {/* Issue 2 */}
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-500 mb-1">Unbounded Generation Risk</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        The instruction "list all possible reasons" is too broad and may cause the LLM to hallucinate or exhaust its token limit. 
                      </p>
                      <div className="mt-3 bg-background border border-border rounded-lg p-3 text-xs font-mono text-emerald-500">
                        <span className="text-muted-foreground select-none">Fix: </span>
                        "List the top 5 most critical reasons..."
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Passed */}
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-500">Tone & Bias Check Passed</h4>
                      <p className="text-xs text-emerald-600/70">No discriminatory language or extreme biases detected.</p>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
    </div>
  );
}
