"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export interface ProgressStep {
  label: string;
  /** Roughly how long this step takes. The last step is held until the work finishes, so its length is only a hint. */
  seconds: number;
}

interface TimedProgressProps {
  steps: ProgressStep[];
  icon: LucideIcon;
  subtitle?: string;
  /** Shown once the schedule is used up but the work is still running. */
  slowHint?: string;
  /** Set when the result is ready: the bar fills, then onFinished fires. */
  done?: boolean;
  onFinished?: () => void;
  accent?: "primary" | "fuchsia";
}

const TICK_MS = 200;
const FINISH_MS = 700;

const ACCENTS = {
  primary: { bar: "bg-primary", tile: "bg-primary/10 border-primary/20 text-primary" },
  fuchsia: { bar: "bg-fuchsia-500", tile: "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-500" },
} as const;

/**
 * A progress card that walks through its steps once, in order, paced by the expected duration of each,
 * then waits on the last step until `done`. It never loops: a long wait shows a hint instead of restarting.
 */
export function TimedProgress({ steps, icon: Icon, subtitle, slowHint, done = false, onFinished, accent = "primary" }: TimedProgressProps) {
  const [elapsed, setElapsed] = useState(0);
  const finishedRef = useRef(false);
  const onFinishedRef = useRef(onFinished);
  const colors = ACCENTS[accent];

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    if (done) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - start) / 1000), TICK_MS);
    return () => clearInterval(id);
  }, [done]);

  useEffect(() => {
    if (!done || finishedRef.current) return;
    const id = setTimeout(() => {
      finishedRef.current = true;
      onFinishedRef.current?.();
    }, FINISH_MS);
    return () => clearTimeout(id);
  }, [done]);

  const total = steps.reduce((sum, s) => sum + s.seconds, 0);
  const lastIndex = steps.length - 1;

  let stepIndex = lastIndex;
  let fill = 1;
  if (!done) {
    let acc = 0;
    stepIndex = -1;
    for (let i = 0; i < steps.length; i++) {
      if (elapsed < acc + steps[i].seconds) {
        stepIndex = i;
        fill = (elapsed - acc) / steps[i].seconds;
        break;
      }
      acc += steps[i].seconds;
    }
    if (stepIndex === -1) {
      // Schedule used up: hold on the last step and creep toward (never reaching) full.
      stepIndex = lastIndex;
      fill = 0.9 + 0.09 * (1 - Math.exp(-(elapsed - total) / 30));
    } else if (stepIndex === lastIndex) {
      fill = Math.min(fill, 0.9);
    }
  }
  const overtime = !done && elapsed > total;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="bg-card border border-border rounded-2xl p-8 shadow-sm text-center"
      role="status"
      aria-live="polite"
    >
      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto mb-4 animate-pulse ${colors.tile}`}>
        <Icon className="w-6 h-6 animate-spin" />
      </div>

      <AnimatePresence mode="wait">
        <motion.h3
          key={done ? "done" : stepIndex}
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={{ duration: 0.2 }}
          className="font-semibold text-sm text-foreground mb-1.5"
        >
          {done ? "Done — opening your prompt..." : steps[stepIndex].label}
        </motion.h3>
      </AnimatePresence>
      <p className="text-xs text-muted-foreground mb-6">
        {overtime && slowHint ? slowHint : subtitle}
      </p>

      <div className="flex justify-center gap-1.5 max-w-sm mx-auto">
        {steps.map((step, idx) => {
          const width = done || idx < stepIndex ? 100 : idx === stepIndex ? Math.round(fill * 100) : 0;
          return (
            <div key={step.label} className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full transition-[width] duration-300 ease-linear ${colors.bar}`} style={{ width: `${width}%` }} />
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mt-3">
        Step {done ? steps.length : stepIndex + 1} of {steps.length}
      </p>
    </motion.div>
  );
}
