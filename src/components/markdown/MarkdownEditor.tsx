"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Eye, Pencil } from "lucide-react";
import { CodeBlock } from "./CodeBlock";
import { markdownProseClass } from "./prose";

/**
 * A plain-textarea Markdown editor with a live preview tab. Used anywhere we used to
 * embed a ReactQuill HTML editor (e.g. the cookbook admin form) so content can be
 * authored in Markdown — better formatting control and proper fenced code blocks.
 */
export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 8,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const [tab, setTab] = useState<"write" | "preview">("write");

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-border bg-muted/20 px-2 pt-1.5">
        <button
          type="button"
          onClick={() => setTab("write")}
          className={`flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            tab === "write" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Pencil className="h-3.5 w-3.5" /> Write
        </button>
        <button
          type="button"
          onClick={() => setTab("preview")}
          className={`flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            tab === "preview" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Eye className="h-3.5 w-3.5" /> Preview
        </button>
      </div>

      {tab === "write" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "Write Markdown here… supports **bold**, lists, and ```code``` blocks."}
          rows={rows}
          className="w-full resize-y bg-transparent px-4 py-3 text-sm font-mono focus:outline-none"
        />
      ) : (
        <div className={`min-h-[80px] px-4 py-3 text-sm ${markdownProseClass}`}>
          {value.trim() ? (
            <ReactMarkdown components={{ pre: CodeBlock }}>{value}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground text-sm italic">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
