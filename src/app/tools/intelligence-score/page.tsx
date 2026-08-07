import { Sparkles } from "lucide-react";

export default function IntelligenceScorePage() {
  return (
    <div className="w-full max-w-4xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-500 text-sm font-bold mb-4">
          <Sparkles className="w-4 h-4" />
          Intelligence Score
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Analyze Prompt Quality</h1>
        <p className="text-muted-foreground text-base">
          Analyze your prompt and get a 0-100 score on clarity, specificity, and AI-readiness.
        </p>
      </div>
      
      <div className="glass-card p-8 rounded-xl border border-border text-center text-muted-foreground">
        Tool UI coming soon...
      </div>
    </div>
  );
}
