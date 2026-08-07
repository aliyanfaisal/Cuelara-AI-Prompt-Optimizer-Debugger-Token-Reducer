import { Terminal } from "lucide-react";

export default function PromptFormatterPage() {
  return (
    <div className="w-full max-w-4xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 text-pink-500 text-sm font-bold mb-4">
          <Terminal className="w-4 h-4" />
          Prompt Formatter
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Format Structure</h1>
        <p className="text-muted-foreground text-base">
          Automatically organize unstructured text into standardized XML tags or markdown sections.
        </p>
      </div>
      
      <div className="glass-card p-8 rounded-xl border border-border text-center text-muted-foreground">
        Tool UI coming soon...
      </div>
    </div>
  );
}
