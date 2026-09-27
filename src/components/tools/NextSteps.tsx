"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight, Sparkles, type LucideIcon } from "lucide-react";
import { setToolHandoff } from "@/lib/tool-handoff";

export interface NextStep {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Icon color, matching the target tool's own accent (e.g. "text-emerald-500" for Prompt Debugger). */
  iconClassName?: string;
}

/**
 * The "Next steps" row shown under a tool's result. Clicking a step hands the result off
 * (see src/lib/tool-handoff.ts) so the target tool's input arrives prefilled.
 */
export function NextSteps({ content, steps }: { content: string; steps: NextStep[] }) {
  const router = useRouter();

  if (!content.trim() || steps.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        Next steps
      </div>
      <div className="flex flex-wrap gap-2">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <button
              key={step.href}
              type="button"
              onClick={() => {
                setToolHandoff(content);
                router.push(step.href);
              }}
              className="group flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${step.iconClassName ?? "text-primary"}`} />
              {step.label}
              <ArrowUpRight className="w-3 h-3 shrink-0 text-muted-foreground opacity-0 -translate-x-0.5 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
