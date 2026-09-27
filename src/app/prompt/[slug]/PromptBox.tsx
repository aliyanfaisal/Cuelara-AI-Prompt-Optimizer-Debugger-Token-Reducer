"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { writeToClipboard } from "@/components/markdown/CodeBlock";

/**
 * A copyable, always-dark text block for raw (non-Markdown) content — the prompt template
 * and example input/output. Same look as CodeBlock so the page reads as one system.
 */
export function PromptBox({ text, label }: { text: string; label?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    const ok = await writeToClipboard(text);
    setStatus(ok ? "copied" : "failed");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#0d1117] shadow-sm">
      {label && (
        <span className="pointer-events-none absolute left-4 top-2 select-none text-[10px] font-semibold uppercase tracking-wider text-[#8b949e]">{label}</span>
      )}
      <button
        type="button"
        onClick={copy}
        aria-label={status === "copied" ? "Copied" : status === "failed" ? "Copy failed — select the text manually" : "Copy"}
        title={status === "copied" ? "Copied" : status === "failed" ? "Copy failed — select the text manually" : "Copy"}
        className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[#8b949e] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        {status === "copied" ? (
          <Check className="h-4 w-4 text-emerald-400" />
        ) : status === "failed" ? (
          <X className="h-4 w-4 text-red-400" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
      <pre className={`overflow-x-auto whitespace-pre-wrap break-words p-4 pr-14 text-sm leading-relaxed text-[#e6edf3] ${label ? "pt-8" : ""}`}>{text}</pre>
    </div>
  );
}
