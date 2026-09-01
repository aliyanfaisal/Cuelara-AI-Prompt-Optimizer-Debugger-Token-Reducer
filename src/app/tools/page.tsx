"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap, Code2, ShieldCheck, Terminal, Sparkles, ArrowRight,
  ExternalLink, BookOpen, Clock, ShieldAlert, Cpu, FileText
} from "lucide-react";

const TOOLS = [
  {
    name: "Prompt Optimizer",
    href: "/tools/prompt-optimizer",
    docs: "/cookbook",
    icon: Code2,
    description: "Transform vague brain-dumps into precisely structured, professional prompts. Choose from Coding, Writing, Business, Research or General modes to generate the perfect instruction set for any LLM.",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    isLarge: true,
  },
  {
    name: "Context Extractor",
    href: "/tools/context-extractor",
    docs: "/cookbook",
    icon: FileText,
    description: "Extract only the relevant data from large PDFs and documents via RAG to slash token usage and eliminate hallucinations in your LLM.",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    isLarge: false,
  },
  {
    name: "Token Optimizer",
    href: "/tools/token-optimizer",
    docs: "/cookbook",
    icon: Zap,
    description: "Compress your prompt token count by up to 50% without losing meaning or constraints.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    isLarge: false,
  },
  {
    name: "Diff & Cost Estimate",
    href: "/tools/compare-estimate",
    docs: "/cookbook",
    icon: ArrowRight,
    description: "Side-by-side visual diffs with precise token counts and API cost savings estimates.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    isLarge: false,
  },
  {
    name: "Prompt Debugger",
    href: "/tools/prompt-debugger",
    docs: "/cookbook",
    icon: ShieldCheck,
    description: "Scan prompts for vague wording, contradictions, and logical traps before production.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    isLarge: false,
  },
  {
    name: "Intelligence Score",
    href: "/tools/intelligence-score",
    docs: "/cookbook",
    icon: Sparkles,
    description: "Get a 0–100 score measuring your prompt's clarity, specificity, and AI-readiness.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    isLarge: false,
  },
  {
    name: "Prompt Formatter",
    href: "/tools/prompt-formatter",
    docs: "/cookbook",
    icon: Terminal,
    description: "Convert unstructured text into standardized Markdown or JSON sections.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
    isLarge: false,
  },
];

export default function ToolsOverviewPage() {
  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      
      {/* 1. Premium Hero Section */}
      <section className="relative w-full pt-0 pb-12 md:pt-4 md:pb-16 flex flex-col items-center">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="max-w-5xl mx-auto px-6 relative z-10 text-center w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted/30 text-muted-foreground text-[11px] font-bold uppercase tracking-widest mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Command Center
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight mb-6">
              AI Prompt Engineering <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">Toolkit</span>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
              Standardizing your prompt structure directly reduces API response latency, minimizes token costs, and halts logical hallucinations before production.
            </p>

            {/* Feature Badges */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-3xl mx-auto">
              <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border/60 rounded-xl shadow-sm">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-foreground">Optimized Latency</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border/60 rounded-xl shadow-sm">
                <ShieldAlert className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-semibold text-foreground">Prevent Collisions</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border/60 rounded-xl shadow-sm">
                <Cpu className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Structure Layouts</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Bento Grid */}
      <div className="max-w-6xl mx-auto px-6 w-full pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 auto-rows-[220px]">
          {TOOLS.map((tool, i) => {
            const Icon = tool.icon;
            return (
              <motion.div
                key={tool.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={`group relative bg-card border border-border/60 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-500 hover:border-primary/30 flex flex-col ${
                  tool.isLarge ? "md:col-span-2 lg:row-span-2 lg:col-span-2" : "col-span-1 row-span-1"
                }`}
              >
                {/* Subtle Hover Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className={`p-6 md:p-8 relative z-10 flex flex-col h-full ${tool.isLarge ? 'justify-between' : ''}`}>
                  
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-2xl ${tool.bg} ${tool.border} border shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`w-6 h-6 ${tool.color}`} />
                    </div>
                    <Link href={tool.href} className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300 shadow-sm">
                      <ArrowRight className="w-4 h-4 -rotate-45 group-hover:rotate-0 transition-transform" />
                    </Link>
                  </div>

                  {/* Text Content */}
                  <div>
                    <Link href={tool.href} className="block w-fit">
                      <h3 className={`font-bold text-foreground mb-2 group-hover:text-primary transition-colors ${
                        tool.isLarge ? "text-2xl md:text-3xl" : "text-lg"
                      }`}>
                        {tool.name}
                      </h3>
                    </Link>
                    <p className={`text-muted-foreground leading-relaxed ${
                      tool.isLarge ? "text-sm md:text-base max-w-xl" : "text-xs line-clamp-2"
                    }`}>
                      {tool.description}
                    </p>
                  </div>

                  {/* Action Buttons (Only for the large featured card to draw attention) */}
                  {tool.isLarge && (
                    <div className="flex items-center gap-3 mt-8">
                      <Link
                        href={tool.href}
                        className="flex items-center gap-2 py-3 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-md hover:shadow-lg hover:-translate-y-0.5"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Launch Optimizer
                      </Link>
                      <Link
                        href={tool.docs}
                        className="flex items-center gap-2 py-3 px-6 rounded-xl border border-border bg-background text-foreground text-sm font-bold hover:bg-muted transition-colors shadow-sm"
                      >
                        <BookOpen className="w-4 h-4" />
                        Read Docs
                      </Link>
                    </div>
                  )}

                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      
    </div>
  );
}
