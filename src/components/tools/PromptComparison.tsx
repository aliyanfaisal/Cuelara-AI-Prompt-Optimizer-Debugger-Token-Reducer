"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Coins, Scissors, Type, Wallet, Info } from "lucide-react";
import { countPromptTokens } from "@/lib/token-count";
import { diffPrompts } from "@/lib/text-diff";

interface PromptComparisonProps {
  basePrompt: string;
  newPrompt: string;
}

// Published input-token rates, per 1M tokens, as of September 2026 — check each
// provider's own pricing page before budgeting off these, rates change often.
const PRICING_MODELS = [
  { name: "GPT-4o", provider: "OpenAI", costPer1M: 2.5 },
  { name: "GPT-4o mini", provider: "OpenAI", costPer1M: 0.15 },
  { name: "Claude Sonnet 5", provider: "Anthropic", costPer1M: 2.0 },
  { name: "Claude Haiku 4.5", provider: "Anthropic", costPer1M: 1.0 },
  { name: "Gemini 3.6 Flash", provider: "Google", costPer1M: 0.75 },
  { name: "Gemini 3.1 Pro", provider: "Google", costPer1M: 2.0 },
  { name: "DeepSeek V4-Flash", provider: "DeepSeek", costPer1M: 0.15 },
];

export function PromptComparison({ basePrompt, newPrompt }: PromptComparisonProps) {
  const [selectedModel, setSelectedModel] = useState(PRICING_MODELS[0]);
  const [isModelOpen, setIsModelOpen] = useState(false);

  const baseTokens = useMemo(() => countPromptTokens(basePrompt), [basePrompt]);
  const newTokens = useMemo(() => countPromptTokens(newPrompt), [newPrompt]);
  const diffParts = useMemo(() => diffPrompts(basePrompt, newPrompt), [basePrompt, newPrompt]);

  const tokenDiff = newTokens - baseTokens;
  const tokenReductionPercent = baseTokens > 0 ? Math.round((tokenDiff / baseTokens) * 100) : 0;

  // Calculate cost per 10k requests based on selected model
  const baseCost10k = (baseTokens / 1000000) * selectedModel.costPer1M * 10000;
  const newCost10k = (newTokens / 1000000) * selectedModel.costPer1M * 10000;
  const savings10k = baseCost10k - newCost10k;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm flex flex-col mt-8"
    >
      {/* Header & Model Selector */}
      <div className="px-5 py-4 border-b border-border/40 bg-muted/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="font-bold text-foreground flex items-center gap-2 text-sm">
          <Wallet className="w-4 h-4 text-primary" />
          Diff & Cost Estimate
        </h3>

        <div className="relative">
          <button
            onClick={() => setIsModelOpen(!isModelOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted transition-all"
          >
            Model Pricing: <span className="text-foreground">{selectedModel.name}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
          </button>

          {isModelOpen && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-card border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
              {PRICING_MODELS.map(model => (
                <button
                  key={model.name}
                  onClick={() => { setSelectedModel(model); setIsModelOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors text-foreground flex justify-between items-center gap-3"
                >
                  <span>
                    {model.name}
                    <span className="text-muted-foreground ml-1.5">· {model.provider}</span>
                  </span>
                  <span className="text-muted-foreground shrink-0">${model.costPer1M.toFixed(2)}/1M</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/40 bg-background">

        {/* Token Diff */}
        <div className="p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3">
            <Scissors className="w-4 h-4 text-rose-500" />
            Token Count
          </div>
          <div className="flex items-end gap-3">
            <span className="text-2xl font-black text-foreground">{newTokens}</span>
            <span className="text-sm font-medium text-muted-foreground mb-1 line-through">{baseTokens}</span>
          </div>
          <div className={`text-xs font-bold mt-2 flex items-center gap-1 ${tokenReductionPercent <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {tokenReductionPercent <= 0 ? '↓' : '↑'} {Math.abs(tokenReductionPercent)}% {tokenReductionPercent <= 0 ? 'Reduction' : 'Increase'}
          </div>
        </div>

        {/* Cost Savings */}
        <div className="p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3">
            <Coins className="w-4 h-4 text-amber-500" />
            Cost per 10k Runs
          </div>
          <div className="flex items-end gap-3">
            <span className="text-2xl font-black text-foreground">${newCost10k.toFixed(2)}</span>
            <span className="text-sm font-medium text-muted-foreground mb-1 line-through">${baseCost10k.toFixed(2)}</span>
          </div>
          <div className={`text-xs font-bold mt-2 flex items-center gap-1 ${savings10k >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {savings10k >= 0 ? `Saved $${savings10k.toFixed(2)}` : `Costs $${Math.abs(savings10k).toFixed(2)} extra`}
          </div>
        </div>

        {/* Characters */}
        <div className="p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3">
            <Type className="w-4 h-4 text-cyan-500" />
            Character Count
          </div>
          <div className="flex items-end gap-3">
            <span className="text-2xl font-black text-foreground">{newPrompt.length}</span>
            <span className="text-sm font-medium text-muted-foreground mb-1">vs {basePrompt.length}</span>
          </div>
          <div className="text-xs font-medium text-muted-foreground mt-2">
            Raw string length comparison
          </div>
        </div>
      </div>

      {/* Graphical Charts Section */}
      <div className="border-t border-border/60 bg-background p-5 grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Token Chart */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Token Usage</h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium">
                <span className="text-muted-foreground">Original</span>
                <span className="text-foreground">{baseTokens} tokens</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max((baseTokens / (Math.max(baseTokens, newTokens) || 1)) * 100, 2)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-rose-500 rounded-full"
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium">
                <span className="text-muted-foreground">Optimized</span>
                <span className="text-foreground">{newTokens} tokens</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max((newTokens / (Math.max(baseTokens, newTokens) || 1)) * 100, 2)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cost Chart */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Estimated Cost (10k Runs)</h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium">
                <span className="text-muted-foreground">Original</span>
                <span className="text-foreground">${baseCost10k.toFixed(2)}</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max((baseCost10k / (Math.max(baseCost10k, newCost10k) || 1)) * 100, 2)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                  className="h-full bg-amber-500 rounded-full"
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium">
                <span className="text-muted-foreground">Optimized</span>
                <span className="text-foreground">${newCost10k.toFixed(2)}</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max((newCost10k / (Math.max(baseCost10k, newCost10k) || 1)) * 100, 2)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Inline Word-Level Diff */}
      <div className="border-t border-border/60 bg-muted/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Word-Level Diff</h4>
          <div className="flex items-center gap-3 text-[10px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/20 border border-rose-500/40" /> Removed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/20 border border-emerald-500/40" /> Added
            </span>
          </div>
        </div>

        {basePrompt.trim() || newPrompt.trim() ? (
          <div className="p-4 rounded-xl border border-border bg-background text-xs font-mono leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[360px]">
            {diffParts.map((part, idx) => {
              if (part.removed) {
                return (
                  <span key={idx} className="bg-rose-500/15 text-rose-600 dark:text-rose-400 line-through decoration-rose-500/60">
                    {part.value}
                  </span>
                );
              }
              if (part.added) {
                return (
                  <span key={idx} className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    {part.value}
                  </span>
                );
              }
              return <span key={idx} className="text-foreground/80">{part.value}</span>;
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-border bg-background text-xs italic text-muted-foreground">
            Paste a base and optimized prompt above to see the word-level diff.
          </div>
        )}

        <div className="flex items-start gap-1.5 mt-3 text-[10px] text-muted-foreground">
          <Info className="w-3 h-3 shrink-0 mt-0.5" />
          <span>Pricing shown is per published input-token rates as of September 2026 — verify against each provider&rsquo;s current pricing page before budgeting.</span>
        </div>
      </div>

    </motion.div>
  );
}
