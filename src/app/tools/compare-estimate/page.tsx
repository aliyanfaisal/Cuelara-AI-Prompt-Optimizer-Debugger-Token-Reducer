import { ArrowRight } from "lucide-react";

export default function CompareEstimatePage() {
  return (
    <div className="w-full max-w-4xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-sm font-bold mb-4">
          <ArrowRight className="w-4 h-4" />
          Compare & Estimate
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Diff & Cost Estimate</h1>
        <p className="text-muted-foreground text-base">
          View visual diffs of optimized prompts and estimate exact API cost savings.
        </p>
      </div>
      
      <div className="glass-card p-8 rounded-xl border border-border text-center text-muted-foreground">
        Tool UI coming soon...
      </div>
    </div>
  );
}
