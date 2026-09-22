"use client";

import { Children, isValidElement, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

export function extractText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return extractText(node.props.children);
  return "";
}

function languageOf(children: ReactNode): string | null {
  for (const child of Children.toArray(children)) {
    if (isValidElement<{ className?: string }>(child)) {
      const match = /language-([\w+#.-]+)/.exec(child.props.className ?? "");
      if (match) return match[1];
    }
  }
  return null;
}

export async function writeToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Older browsers / non-secure contexts have no async clipboard API.
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

// Always dark, regardless of the site theme, so code reads the same in light and dark mode.
// `node` is react-markdown's AST handle; it must not reach the DOM element.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CodeBlock({ children, node: _node, ...props }: ComponentPropsWithoutRef<"pre"> & { node?: unknown }) {
  const [copied, setCopied] = useState(false);
  const language = languageOf(children);

  async function copy() {
    await writeToClipboard(extractText(children).replace(/\n$/, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group relative my-6 overflow-hidden rounded-xl border border-white/10 bg-[#0d1117] shadow-sm">
      {language && (
        <span className="pointer-events-none absolute left-4 top-2 select-none text-[10px] font-semibold uppercase tracking-wider text-[#8b949e]">{language}</span>
      )}
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Code copied" : "Copy code"}
        title={copied ? "Copied" : "Copy code"}
        className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[#8b949e] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      </button>
      <pre {...props} className={`overflow-x-auto p-4 pr-14 text-sm leading-relaxed text-[#e6edf3] ${language ? "pt-8" : ""}`}>
        {children}
      </pre>
    </div>
  );
}
