"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronDown, Coins, Scissors, Wallet, Info, Gauge, Layers } from "lucide-react";
import { countPromptTokens } from "@/lib/token-count";
import { diffPrompts } from "@/lib/text-diff";
import {
  PRICED_MODELS,
  PRICING_AS_OF,
  VOLUME_TIERS,
  DEFAULT_OUTPUT_TOKENS,
  estimateCost,
  formatUsd,
  formatCompactNumber,
} from "@/lib/model-pricing";

interface PromptComparisonProps {
  basePrompt: string;
  newPrompt: string;
}

const MAX_REQUESTS = 1_000_000_000;
const MAX_OUTPUT_TOKENS = 1_000_000;

function parseCount(raw: string, max: number): number {
  const n = Math.floor(Number(raw.replace(/,/g, "")));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, max);
}

function contextShare(tokens: number, window: number): string {
  const pct = (tokens / window) * 100;
  if (pct === 0) return "0%";
  if (pct < 0.01) return "<0.01%";
  return `${pct < 10 ? pct.toFixed(2) : pct.toFixed(1)}%`;
}

export function PromptComparison({ basePrompt, newPrompt }: PromptComparisonProps) {
  const [selectedModel, setSelectedModel] = useState(PRICED_MODELS[0]);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [requests, setRequests] = useState(100_000);
  const [outputTokens, setOutputTokens] = useState(DEFAULT_OUTPUT_TOKENS);

  const baseTokens = useMemo(() => countPromptTokens(basePrompt), [basePrompt]);
  const newTokens = useMemo(() => countPromptTokens(newPrompt), [newPrompt]);
  const diffParts = useMemo(() => diffPrompts(basePrompt, newPrompt), [basePrompt, newPrompt]);

  const tokenDiff = newTokens - baseTokens;
  const tokenReductionPercent = baseTokens > 0 ? Math.round((tokenDiff / baseTokens) * 100) : 0;

  const baseCost = estimateCost(selectedModel, baseTokens, outputTokens, requests);
  const newCost = estimateCost(selectedModel, newTokens, outputTokens, requests);
  const savings = baseCost.total - newCost.total;

  const chartData = [
    { label: "Original", Input: baseCost.input, Output: baseCost.output },
    { label: "Optimized", Input: newCost.input, Output: newCost.output },
  ];

  const matrix = useMemo(
    () =>
      PRICED_MODELS.map((model) => {
        const base = estimateCost(model, baseTokens, outputTokens, requests);
        const next = estimateCost(model, newTokens, outputTokens, requests);
        return { model, base: base.total, next: next.total, saved: base.total - next.total };
      }),
    [baseTokens, newTokens, outputTokens, requests]
  );
  const maxSaved = Math.max(...matrix.map((row) => row.saved), 0);

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
            <div className="absolute top-full right-0 mt-1 w-72 bg-card border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
              {PRICED_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => { setSelectedModel(model); setIsModelOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors text-foreground flex justify-between items-center gap-3"
                >
                  <span>
                    {model.name}
                    <span className="text-muted-foreground ml-1.5">· {model.provider}</span>
                  </span>
                  <span className="text-muted-foreground shrink-0">
                    ${model.inputPer1M} in / ${model.outputPer1M} out
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Usage Assumptions */}
      <div className="px-5 py-4 border-b border-border/40 bg-background flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-8">
        <div className="space-y-2">
          <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Requests per month</span>
          <div className="flex flex-wrap items-center gap-2">
            {VOLUME_TIERS.map((tier) => (
              <button
                key={tier}
                onClick={() => setRequests(tier)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  requests === tier
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {formatCompactNumber(tier)}
              </button>
            ))}
            <input
              type="text"
              inputMode="numeric"
              aria-label="Custom requests per month"
              value={requests.toLocaleString("en-US")}
              onChange={(e) => setRequests(parseCount(e.target.value, MAX_REQUESTS))}
              className="w-28 bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="space-y-2">
          <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Output tokens per response</span>
          <input
            type="text"
            inputMode="numeric"
            aria-label="Expected output tokens per response"
            value={outputTokens.toLocaleString("en-US")}
            onChange={(e) => setOutputTokens(parseCount(e.target.value, MAX_OUTPUT_TOKENS))}
            className="w-28 bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed lg:max-w-xs">
          Output length doesn&rsquo;t change when you shorten a prompt, so it&rsquo;s counted equally on both sides — only input cost shrinks.
        </p>
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
          <div className="text-[11px] text-muted-foreground mt-1">
            {newPrompt.length} vs {basePrompt.length} characters
          </div>
        </div>

        {/* Cost Savings */}
        <div className="p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3">
            <Coins className="w-4 h-4 text-amber-500" />
            Monthly Cost · {formatCompactNumber(requests)} runs
          </div>
          <div className="flex items-end gap-3">
            <span className="text-2xl font-black text-foreground">{formatUsd(newCost.total)}</span>
            <span className="text-sm font-medium text-muted-foreground mb-1 line-through">{formatUsd(baseCost.total)}</span>
          </div>
          <div className={`text-xs font-bold mt-2 flex items-center gap-1 ${savings >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {savings >= 0 ? `Saved ${formatUsd(savings)}` : `Costs ${formatUsd(Math.abs(savings))} extra`}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {selectedModel.name} · ${selectedModel.inputPer1M}/1M in · ${selectedModel.outputPer1M}/1M out
          </div>
        </div>

        {/* Context Window */}
        <div className="p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3">
            <Gauge className="w-4 h-4 text-cyan-500" />
            Context Window Used
          </div>
          <div className="flex items-end gap-3">
            <span className="text-2xl font-black text-foreground">{contextShare(newTokens, selectedModel.contextWindow)}</span>
            <span className="text-sm font-medium text-muted-foreground mb-1 line-through">{contextShare(baseTokens, selectedModel.contextWindow)}</span>
          </div>
          <div className="text-xs font-medium text-muted-foreground mt-2">
            of {selectedModel.name}&rsquo;s {formatCompactNumber(selectedModel.contextWindow)}-token window
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

        {/* Input vs Output Cost Chart */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Input vs Output Cost · {formatCompactNumber(requests)} runs
          </h4>
          <div className="h-[190px] text-muted-foreground">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 11 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v: number) => formatUsd(v)}
                  tick={{ fill: "currentColor", fontSize: 10 }}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  formatter={(value) => formatUsd(Number(value))}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "var(--card-foreground)",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Input" stackId="cost" fill="#f59e0b" maxBarSize={56} />
                <Bar dataKey="Output" stackId="cost" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Scale Tiers for the selected model */}
      <div className="border-t border-border/60 bg-background p-5 space-y-3">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          Savings at Scale · {selectedModel.name}
        </h4>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="p-3">Requests / month</th>
                  <th className="p-3">Original</th>
                  <th className="p-3 text-primary">Optimized</th>
                  <th className="p-3 text-emerald-600 dark:text-emerald-400">Net savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {VOLUME_TIERS.map((tier) => {
                  const base = estimateCost(selectedModel, baseTokens, outputTokens, tier).total;
                  const next = estimateCost(selectedModel, newTokens, outputTokens, tier).total;
                  const saved = base - next;
                  return (
                    <tr key={tier}>
                      <td className="p-3 font-semibold text-foreground">{tier.toLocaleString("en-US")}</td>
                      <td className="p-3 text-muted-foreground">{formatUsd(base)}</td>
                      <td className="p-3 font-semibold text-primary">{formatUsd(next)}</td>
                      <td className={`p-3 font-semibold ${saved >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {saved >= 0 ? "+" : "−"}{formatUsd(Math.abs(saved))} / mo
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cross-Provider Matrix */}
      <div className="border-t border-border/60 bg-muted/5 p-5 space-y-3">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          Every Model at {requests.toLocaleString("en-US")} runs / month
        </h4>
        <div className="rounded-xl border border-border overflow-hidden bg-background">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="p-3">Model</th>
                  <th className="p-3">In / Out per 1M</th>
                  <th className="p-3">Context window</th>
                  <th className="p-3">Original</th>
                  <th className="p-3 text-primary">Optimized</th>
                  <th className="p-3 text-emerald-600 dark:text-emerald-400">Net savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {matrix.map(({ model, base, next, saved }) => (
                  <tr
                    key={model.id}
                    onClick={() => setSelectedModel(model)}
                    className={`cursor-pointer hover:bg-muted/40 transition-colors ${model.id === selectedModel.id ? "bg-primary/5" : ""}`}
                  >
                    <td className="p-3 font-semibold text-foreground whitespace-nowrap">
                      {model.name}
                      <span className="text-muted-foreground font-normal ml-1.5">· {model.provider}</span>
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">${model.inputPer1M} / ${model.outputPer1M}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {formatCompactNumber(model.contextWindow)} · {contextShare(newTokens, model.contextWindow)} used
                    </td>
                    <td className="p-3 text-muted-foreground">{formatUsd(base)}</td>
                    <td className="p-3 font-semibold text-primary">{formatUsd(next)}</td>
                    <td className={`p-3 font-semibold whitespace-nowrap ${saved >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {saved >= 0 ? "+" : "−"}{formatUsd(Math.abs(saved))}
                      {saved > 0 && saved === maxSaved && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] uppercase">Biggest</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">Click a row to make it the model used in the cards and chart above.</p>
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
          <span>
            Rates are published standard API prices as of {PRICING_AS_OF} (DeepSeek at off-peak rates) — verify against each provider&rsquo;s pricing page before budgeting.
            Token counts use the GPT-4o (o200k) encoding as a common reference; each provider tokenizes slightly differently, and Anthropic reports its newer models (Claude Sonnet 5) produce roughly 30% more tokens than its older tokenizer, so real Claude bills can run higher. Prompt caching and batch discounts aren&rsquo;t modeled.
          </span>
        </div>
      </div>

    </motion.div>
  );
}
