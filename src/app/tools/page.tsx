"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap, Code2, ShieldCheck, Terminal, Sparkles, ArrowRight,
  ChevronLeft, ChevronRight, ExternalLink, BookOpen, Clock, ShieldAlert, Cpu
} from "lucide-react";

const TOOLS = [
  {
    name: "Token Optimizer",
    href: "/tools/token-optimizer",
    docs: "/cookbook",
    icon: Zap,
    description: "Compress your prompt token count by up to 50% without losing meaning, constraints, or functionality. Perfect for high-volume API use cases.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    glow: "0 0 60px rgba(245,158,11,0.25), 0 0 20px rgba(245,158,11,0.1)",
  },
  {
    name: "Prompt Optimizer",
    href: "/tools/prompt-optimizer",
    docs: "/cookbook",
    icon: Code2,
    description: "Transform vague brain-dumps into precisely structured, professional prompts. Choose from Coding, Writing, Business, Research or General modes.",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    glow: "0 0 60px rgba(79,70,229,0.25), 0 0 20px rgba(79,70,229,0.1)",
  },
  {
    name: "Prompt Debugger",
    href: "/tools/prompt-debugger",
    docs: "/cookbook",
    icon: ShieldCheck,
    description: "Scan prompts for vague wording, contradictions, missing context and conflicting requirements before you spend tokens on bad outputs.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    glow: "0 0 60px rgba(16,185,129,0.25), 0 0 20px rgba(16,185,129,0.1)",
  },
  {
    name: "Prompt Formatter",
    href: "/tools/prompt-formatter",
    docs: "/cookbook",
    icon: Terminal,
    description: "Convert unstructured text into standardized sections — Role, Task, Requirements, Constraints, Output Format — ready for any frontier LLM.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
    glow: "0 0 60px rgba(236,72,153,0.25), 0 0 20px rgba(236,72,153,0.1)",
  },
  {
    name: "Intelligence Score",
    href: "/tools/intelligence-score",
    docs: "/cookbook",
    icon: Sparkles,
    description: "Get a 0–100 score measuring your prompt's clarity, specificity, structure and AI-readiness with concrete, actionable improvement suggestions.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    glow: "0 0 60px rgba(139,92,246,0.25), 0 0 20px rgba(139,92,246,0.1)",
  },
  {
    name: "Diff & Cost Estimate",
    href: "/tools/compare-estimate",
    docs: "/cookbook",
    icon: ArrowRight,
    description: "Side-by-side visual diffs of original vs optimized prompts with precise token counts and API cost savings estimates per 1,000 requests.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    glow: "0 0 60px rgba(59,130,246,0.25), 0 0 20px rgba(59,130,246,0.1)",
  },
];

const CARD_RATIO = 0.75; 
const GAP = 12;

export default function ToolsOverviewPage() {
  const [active, setActive] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const N = TOOLS.length;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const prev = useCallback(() => setActive((a) => (a - 1 + N) % N), [N]);
  const next = useCallback(() => setActive((a) => (a + 1) % N), [N]);

  // Auto-move slider
  useEffect(() => {
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [next]);

  // Responsive calculations
  const isMobile = containerWidth < 768;
  const cardWidth = containerWidth > 0 
    ? (isMobile ? Math.min(containerWidth * 0.85, 320) : containerWidth * CARD_RATIO) 
    : 550;
  
  // Taller cards on mobile so buttons can stack
  const cardHeight = isMobile ? 340 : 340;
  
  const slot = cardWidth + GAP;
  const sideAvailable = (containerWidth - cardWidth) / 2;
  const visibleRadius = Math.ceil(sideAvailable / slot) + 1;

  function getNormalizedOffset(i: number) {
    let d = i - active;
    const half = Math.floor(N / 2);
    if (d > half) d -= N;
    if (d < -half) d += N;
    return d;
  }

  return (
    <div className="flex flex-col w-full overflow-x-hidden">

      {/* SEO & User Attracting Content Section */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="px-6 md:px-8 border-b border-border/60 pb-8 mb-4 mt-8 md:mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 bg-background"
      >
        <div>
          <h2 className="text-base font-bold text-foreground mb-3">
            Build High-Performance, Production-Ready Instructions
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            In generative AI, your prompt is the absolute blueprint of your LLM application's behavior. Standardizing your prompt structure directly reduces API response latency, minimizes token costs, and halts logical hallucinations before production.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Our toolkit offers system engineers and developers a suite of granular diagnostic tools to measure instruction density, refine formatting patterns, and estimate token efficiency seamlessly.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg mt-0.5 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-0.5">Optimized Latency & Expenses</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Compress instructional redundancy up to 50% without compromising system rules or constraints.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg mt-0.5 shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-0.5">Prevent Rule Collisions</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Analyze and detect conflicting instruction rules, logical traps, and vague definitions.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2 bg-primary/10 border border-primary/20 text-primary rounded-lg mt-0.5 shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-0.5">Structure Layout Pipelines</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Automatically generate valid XML frameworks, JSON formatting schemas, or standardized Markdown.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Slider Container */}
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ height: cardHeight + 120 }} 
      >
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          {containerWidth > 0 &&
            TOOLS.map((tool, i) => {
              const d = getNormalizedOffset(i);
              const isCenter = d === 0;
              const absD = Math.abs(d);

              const scale = isCenter ? 1 : Math.max(0.82, 1 - absD * 0.06);
              const opacity = absD <= visibleRadius ? 1 : 0;
              const zIndex = isCenter ? 20 : Math.max(1, 18 - absD * 2);
              const Icon = tool.icon;

              return (
                <motion.div
                  key={tool.name}
                  className="absolute"
                  style={{
                    width: cardWidth,
                    height: cardHeight,
                    left: "50%",
                    marginLeft: -(cardWidth / 2),
                    top: 60, // Vertically center within taller container for shadow space
                  }}
                  animate={{ x: d * slot, scale, opacity, zIndex }}
                  transition={{
                    type: "spring",
                    stiffness: 350,
                    damping: 35,
                    mass: 0.85,
                  }}
                >
                  <div
                    className="w-full h-full rounded-2xl border border-border bg-card flex flex-col items-center text-center p-6 sm:p-8 transition-all duration-300"
                    style={{
                      boxShadow: isCenter ? tool.glow : "0 2px 10px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div className={`p-3 sm:p-4 bg-card border border-border text-foreground rounded-xl sm:rounded-2xl w-fit mb-4 sm:mb-5 flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 sm:w-8 sm:h-8 ${tool.color}`} />
                    </div>

                    <h3 className={`font-bold text-foreground mb-2 sm:mb-3 ${isCenter ? "text-lg sm:text-xl" : "text-base sm:text-lg"}`}>
                      {tool.name}
                    </h3>

                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6">
                      {tool.description}
                    </p>

                    {/* Responsive Buttons - Stack vertically on small screens to prevent overflow */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-md mt-auto">
                      <Link
                        href={tool.href}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] sm:text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Try it
                      </Link>
                      <Link
                        href={tool.docs}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border bg-background text-foreground text-[13px] sm:text-sm font-medium hover:bg-muted transition-colors shadow-sm"
                      >
                        <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Docs
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </div>

        {/* Carousel Navigation Arrows - Moved closer to edges for mobile */}
        <button
          onClick={prev}
          className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all hover:scale-105 active:scale-95"
          aria-label="Previous tool"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <button
          onClick={next}
          className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all hover:scale-105 active:scale-95"
          aria-label="Next tool"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="pb-6 flex items-center justify-center gap-1.5 -mt-4">
        {TOOLS.map((tool, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-label={`Jump to ${tool.name}`}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === active ? 20 : 6,
              height: 6,
              backgroundColor: i === active ? "hsl(var(--primary))" : "hsl(var(--border))",
            }}
          />
        ))}
      </div>
      
    </div>
  );
}
