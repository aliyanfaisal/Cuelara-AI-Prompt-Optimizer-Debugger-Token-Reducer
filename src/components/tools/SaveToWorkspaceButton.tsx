"use client";

import { useState } from "react";
import Link from "next/link";
import { BookMarked, Check, ChevronDown, Loader2 } from "lucide-react";

interface WorkspaceOption {
  id: string;
  name: string;
  type: "personal" | "team";
}

type Status = "idle" | "loading" | "saving" | "saved" | "signin" | "error";

/**
 * Saves a tool result into the signed-in user's workspace library. With only a personal workspace it saves in one
 * click; if the user also belongs to a team it offers a short menu to choose where. Signed-out visitors are pointed to login.
 */
export function SaveToWorkspaceButton({ content, title, tool }: { content: string; title?: string; tool: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [options, setOptions] = useState<WorkspaceOption[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savedTo, setSavedTo] = useState<string | null>(null);

  async function save(workspaceId?: string) {
    setStatus("saving");
    setMessage(null);
    try {
      const res = await fetch("/api/workspace/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, title, content, tool }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) return setStatus("signin");
      if (!res.ok) {
        setMessage(data.error ?? "Couldn't save. Please try again.");
        return setStatus("error");
      }
      setSavedTo(data.workspaceId ?? null);
      setOptions(null);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 4000);
    } catch {
      setMessage("Network error — please try again.");
      setStatus("error");
    }
  }

  async function handleClick() {
    if (!content.trim() || status === "loading" || status === "saving") return;
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/workspace");
      if (res.status === 401) return setStatus("signin");
      const data = await res.json();
      const list: WorkspaceOption[] = data.workspaces ?? [];
      if (list.length <= 1) return save(list[0]?.id);
      setOptions(list);
      setStatus("idle");
    } catch {
      setMessage("Network error — please try again.");
      setStatus("error");
    }
  }

  if (status === "signin") {
    return (
      <span className="text-xs text-muted-foreground">
        <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link> to save prompts
      </span>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        disabled={status === "loading" || status === "saving"}
        className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-60"
      >
        {status === "loading" || status === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : status === "saved" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <BookMarked className="h-3.5 w-3.5" />}
        {status === "saved" ? "Saved" : "Save to workspace"}
        {options && <ChevronDown className="h-3 w-3 opacity-50" />}
      </button>
      {options && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 min-w-48 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-xl">
          {options.map((o) => (
            <button key={o.id} role="menuitem" onClick={() => save(o.id)} className="block w-full px-3 py-2 text-left text-xs hover:bg-muted">
              {o.type === "team" ? `👥 ${o.name}` : "My prompts (private)"}
            </button>
          ))}
        </div>
      )}
      {status === "saved" && (
        <Link href={`/dashboard/workspace${savedTo ? `?w=${savedTo}` : ""}`} className="ml-2 text-xs font-semibold text-primary hover:underline">View</Link>
      )}
      {status === "error" && message && <p role="alert" className="absolute right-0 top-full mt-1 w-56 text-xs text-rose-600 dark:text-rose-400">{message}</p>}
    </div>
  );
}
