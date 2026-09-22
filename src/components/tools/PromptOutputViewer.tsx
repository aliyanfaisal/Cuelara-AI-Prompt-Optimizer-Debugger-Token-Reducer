"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Eye, Code } from "lucide-react";
import { CodeBlock } from "@/components/markdown/CodeBlock";

export type PromptViewMode = "rendered" | "text";

interface PromptViewToggleProps {
  viewMode: PromptViewMode;
  onViewModeChange: (mode: PromptViewMode) => void;
  className?: string;
}

export function PromptViewToggle({
  viewMode,
  onViewModeChange,
  className = "",
}: PromptViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Prompt display mode"
      className={`inline-flex items-center p-0.5 rounded-lg bg-muted/60 border border-border text-xs ${className}`}
    >
      <button
        type="button"
        onClick={() => onViewModeChange("rendered")}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
          viewMode === "rendered"
            ? "bg-background text-foreground shadow-xs font-semibold"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="View formatted markdown"
        aria-pressed={viewMode === "rendered"}
      >
        <Eye className="w-3.5 h-3.5" />
        <span>Rendered</span>
      </button>

      <button
        type="button"
        onClick={() => onViewModeChange("text")}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
          viewMode === "text"
            ? "bg-background text-foreground shadow-xs font-semibold"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="View raw prompt text"
        aria-pressed={viewMode === "text"}
      >
        <Code className="w-3.5 h-3.5" />
        <span>Text</span>
      </button>
    </div>
  );
}

export interface PromptOutputViewerProps {
  content: string;
  isStreaming?: boolean;
  viewMode?: PromptViewMode;
  onViewModeChange?: (mode: PromptViewMode) => void;
  accentColor?: "primary" | "amber" | "pink" | "emerald";
  maxHeight?: string;
  className?: string;
  language?: string;
}

const ACCENT_CURSOR_CLASSES: Record<
  NonNullable<PromptOutputViewerProps["accentColor"]>,
  string
> = {
  primary: "bg-primary/70",
  amber: "bg-amber-500/70",
  pink: "bg-pink-500/70",
  emerald: "bg-emerald-500/70",
};

export function PromptOutputViewer({
  content,
  isStreaming = false,
  viewMode: controlledViewMode,
  onViewModeChange,
  accentColor = "primary",
  maxHeight = "max-h-[420px]",
  className = "",
  language,
}: PromptOutputViewerProps) {
  const [internalViewMode, setInternalViewMode] =
    useState<PromptViewMode>("rendered");

  const viewMode = controlledViewMode ?? internalViewMode;

  const cursorClass = ACCENT_CURSOR_CLASSES[accentColor];

  // If content is non-markdown (e.g. XML or JSON in Prompt Formatter) and in rendered mode,
  // we format it into a fenced code block so CodeBlock highlights and renders it cleanly.
  const renderedContent =
    language && language !== "markdown"
      ? `\`\`\`${language}\n${content}\n\`\`\``
      : content;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {viewMode === "rendered" ? (
        <div
          className={`p-5 md:p-6 bg-muted/10 text-foreground overflow-y-auto leading-relaxed select-text ${maxHeight} text-xs sm:text-sm space-y-3.5 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:pb-1 [&_h1]:border-b [&_h1]:border-border/40 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:pb-1 [&_h2]:border-b [&_h2]:border-border/30 [&_h3]:text-xs [&_h3]:sm:text-sm [&_h3]:font-bold [&_h3]:uppercase [&_h3]:tracking-wider [&_h3]:text-primary [&_h3]:mt-3.5 [&_h3]:mb-1.5 [&_h4]:text-xs [&_h4]:font-bold [&_h4]:uppercase [&_h4]:tracking-wider [&_h4]:text-foreground/80 [&_h4]:mt-3 [&_h4]:mb-1 [&_p]:leading-relaxed [&_p]:text-foreground/90 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:my-2 [&_li]:leading-relaxed [&_li]:text-foreground/85 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:bg-primary/5 [&_blockquote]:rounded-r-lg [&_blockquote]:px-3.5 [&_blockquote]:py-2 [&_blockquote]:my-2.5 [&_blockquote]:text-foreground/80 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-primary [&_code]:dark:text-primary-foreground [&_code]:border [&_code]:border-border/40 [&_pre_code]:rounded-none [&_pre_code]:bg-transparent [&_pre_code]:border-0 [&_pre_code]:p-0 [&_hr]:my-4 [&_hr]:border-border/50 [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_table]:my-3 [&_table]:text-xs [&_th]:border [&_th]:border-border [&_th]:bg-muted/40 [&_th]:p-2 [&_th]:font-semibold [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:p-2`}
        >
          <ReactMarkdown components={{ pre: CodeBlock }}>
            {renderedContent}
          </ReactMarkdown>
          {isStreaming && (
            <span
              className={`inline-block w-1.5 h-3.5 ${cursorClass} ml-0.5 animate-pulse align-middle`}
              aria-label="Generating"
            />
          )}
        </div>
      ) : (
        <pre
          className={`p-5 md:p-6 bg-muted/10 font-mono text-xs leading-relaxed text-foreground overflow-x-auto whitespace-pre-wrap break-words select-text ${maxHeight}`}
        >
          {content}
          {isStreaming && (
            <span
              className={`inline-block w-1.5 h-3.5 ${cursorClass} ml-0.5 animate-pulse align-middle`}
              aria-label="Generating"
            />
          )}
        </pre>
      )}
    </div>
  );
}
