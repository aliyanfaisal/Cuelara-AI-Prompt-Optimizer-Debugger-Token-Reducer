"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export interface ToolExample {
  file: string;
  before: string;
  after: string;
  badgeBefore: string;
  badgeAfter: string;
  /** The raw text inserted into the tool's input when "Use this example" is clicked. */
  useValue: string;
}

/**
 * The homepage's rotating before/after demo card (see PromptDemo in src/app/page.tsx),
 * reused on individual tool pages with a "Use this example" action wired to that tool's input.
 */
export function ToolExampleCarousel({
  examples,
  onUse,
  beforeTag = "Before",
  beforeLabel = "Example Input",
  afterTag = "After",
  afterLabel = "Expected Result",
  useLabel = "Use this example",
  afterTextClassName = "text-primary",
  buttonClassName = "bg-primary hover:bg-primary/90 text-primary-foreground",
}: {
  examples: ToolExample[];
  onUse: (value: string) => void;
  beforeTag?: string;
  beforeLabel?: string;
  afterTag?: string;
  afterLabel?: string;
  useLabel?: string;
  /** Tailwind classes for the "after" value's text color, matching the tool's own accent. */
  afterTextClassName?: string;
  /** Tailwind classes for the "Use this example" button, matching the tool's own accent. */
  buttonClassName?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % examples.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [examples.length]);

  const current = examples[currentIndex];

  return (
    <div className="w-full rounded-2xl overflow-hidden text-left border border-border bg-card shadow-sm">
      <div className="flex items-center px-4 py-3 border-b border-border/50 bg-muted/50">
        <div className="flex gap-2 w-16">
          <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500/20" />
          <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500/20" />
          <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500/20" />
        </div>

        <div className="flex-1 flex justify-center gap-2 overflow-hidden">
          {examples.map((example, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`text-xs font-mono px-3 py-1 rounded-md transition-all duration-300 ${
                idx === currentIndex ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hidden sm:block hover:text-foreground"
              }`}
            >
              {example.file}
            </button>
          ))}
        </div>

        <div className="w-16" />
      </div>

      <div className="p-5 md:p-6 font-mono text-sm leading-relaxed min-h-[200px] flex flex-col justify-center bg-background/40">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-5"
          >
            <div>
              <div className="flex items-center text-xs font-bold text-red-500/80 uppercase tracking-wider mb-2">
                <span className="bg-red-500/10 px-2 py-0.5 rounded text-[10px] mr-2">{beforeTag}</span>
                {beforeLabel}
              </div>
              <div className="text-muted-foreground relative pl-4 border-l-2 border-red-500/30">
                <span className="text-foreground/80">&ldquo;{current.before}&rdquo;</span>
                <span className="inline-flex items-center ml-3 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-bold whitespace-nowrap">
                  {current.badgeBefore}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center text-xs font-bold text-green-500 uppercase tracking-wider mb-2">
                <span className="bg-green-500/10 px-2 py-0.5 rounded text-[10px] mr-2">{afterTag}</span>
                {afterLabel}
              </div>
              <div className="text-foreground relative pl-4 border-l-2 border-green-500/50">
                <span className={`font-medium ${afterTextClassName}`}>{current.after}</span>
                <span className="inline-flex items-center ml-3 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold whitespace-nowrap">
                  {current.badgeAfter}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onUse(current.useValue)}
              className={`self-start inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-opacity hover:opacity-90 ${buttonClassName}`}
            >
              {useLabel} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
