"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Coins, Scissors, Type, ArrowRight, Wallet } from "lucide-react";

interface PromptComparisonProps {
  basePrompt: string;
  newPrompt: string;
}

const PRICING_MODELS = [
  { name: "GPT-4o", costPer1M: 5.00 },
  { name: "Claude 3.5 Sonnet", costPer1M: 3.00 },
  { name: "GPT-4o Mini", costPer1M: 0.15 },
  { name: "Claude 3 Haiku", costPer1M: 0.25 },
];

export function PromptComparison({ basePrompt, newPrompt }: PromptComparisonProps) {
  const [selectedModel, setSelectedModel] = useState(PRICING_MODELS[0]);
  const [isModelOpen, setIsModelOpen] = useState(false);

  // Rough estimation: 1 word ~ 1.3 tokens
  const getTokens = (text: string) => Math.ceil((text.trim().split(/\s+/).length || 0) * 1.3);
  
  const baseTokens = getTokens(basePrompt);
  const newTokens = getTokens(newPrompt);
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
            <div className="absolute top-full right-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
              {PRICING_MODELS.map(model => (
                <button
                  key={model.name}
                  onClick={() => { setSelectedModel(model); setIsModelOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors text-foreground flex justify-between items-center"
                >
                  <span>{model.name}</span>
                  <span className="text-muted-foreground">${model.costPer1M.toFixed(2)}/1M</span>
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

      {/* Side-by-Side Diff View */}
      <div className="border-t border-border/60 bg-muted/5 p-5">
        <h4 className="text-xs font-bold text-foreground mb-4 uppercase tracking-wider">Side-by-Side Diff</h4>
        
        <div className="flex flex-col md:flex-row gap-4">
          {/* Base Prompt */}
          <div className="flex-1 bg-rose-500/5 border border-rose-500/20 rounded-xl overflow-hidden flex flex-col">
            <div className="bg-rose-500/10 px-3 py-1.5 border-b border-rose-500/20 text-[10px] font-bold text-rose-600 uppercase tracking-wider">
              Original Prompt
            </div>
            <div className="p-4 text-xs font-mono text-rose-700/80 leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[300px]">
              {basePrompt || <span className="italic opacity-50">No original prompt provided.</span>}
            </div>
          </div>

          {/* Icon Separator (Desktop only) */}
          <div className="hidden md:flex items-center justify-center shrink-0">
            <div className="p-2 bg-background border border-border rounded-full shadow-sm text-muted-foreground">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* New Prompt */}
          <div className="flex-1 bg-emerald-500/5 border border-emerald-500/20 rounded-xl overflow-hidden flex flex-col">
            <div className="bg-emerald-500/10 px-3 py-1.5 border-b border-emerald-500/20 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
              New Prompt
            </div>
            <div className="p-4 text-xs font-mono text-emerald-700/80 leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[300px]">
              {newPrompt || <span className="italic opacity-50">No new prompt provided.</span>}
            </div>
          </div>
        </div>
      </div>

    </motion.div>
  );
}
