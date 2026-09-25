"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { createSavedPrompt, deleteSavedPrompt, updateSavedPrompt } from "./actions";

export interface LibraryPrompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  /** Human label of the tool it was saved from (computed server-side), or null when written by hand. */
  sourceLabel: string | null;
  updatedAt: string;
  authorId: string;
  authorName: string;
}

interface Draft {
  id: string | null;
  title: string;
  content: string;
  tags: string;
}

const EMPTY: Draft = { id: null, title: "", content: "", tags: "" };

export function PromptLibrary({ workspaceId, isTeam, role, userId, prompts }: { workspaceId: string; isTeam: boolean; role: string; userId: string; prompts: LibraryPrompt[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allTags = useMemo(() => Array.from(new Set(prompts.flatMap((p) => p.tags))).sort(), [prompts]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prompts.filter((p) => (!tag || p.tags.includes(tag)) && (!q || `${p.title} ${p.content} ${p.tags.join(" ")}`.toLowerCase().includes(q)));
  }, [prompts, query, tag]);

  const canEdit = (p: LibraryPrompt) => role === "OWNER" || role === "ADMIN" || p.authorId === userId;

  function save() {
    if (!draft) return;
    const input = { title: draft.title, content: draft.content, tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean) };
    setError(null);
    startTransition(async () => {
      const result = draft.id ? await updateSavedPrompt(draft.id, input) : await createSavedPrompt(workspaceId, input);
      if ("error" in result) return setError(result.error);
      setDraft(null);
      router.refresh();
    });
  }

  function remove(p: LibraryPrompt) {
    if (!confirm(`Delete “${p.title}”?`)) return;
    startTransition(async () => {
      const result = await deleteSavedPrompt(p.id);
      if ("error" in result) return setError(result.error);
      router.refresh();
    });
  }

  function copy(p: LibraryPrompt) {
    navigator.clipboard.writeText(p.content);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 max-w-sm flex-1 items-center rounded-xl border border-border bg-background px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search prompts…" aria-label="Search prompts" className="w-full bg-transparent text-sm focus:outline-none" />
        </div>
        <button onClick={() => { setError(null); setDraft(EMPTY); }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New prompt
        </button>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allTags.map((t) => (
            <button key={t} onClick={() => setTag(tag === t ? null : t)} aria-pressed={tag === t} className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${tag === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
              #{t}
            </button>
          ))}
        </div>
      )}

      {draft && (
        <div className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title (optional)" maxLength={120} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <textarea value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} placeholder="The prompt…" rows={8} className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} placeholder="Tags, comma separated (e.g. email, launch)" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={pending || !draft.content.trim()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} {draft.id ? "Save changes" : "Save prompt"}
            </button>
            <button onClick={() => setDraft(null)} className="h-10 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">Cancel</button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center text-sm text-muted-foreground">
          {prompts.length === 0 ? (isTeam ? "The team library is empty. Save a prompt from any tool, or add one with “New prompt”." : "You haven't saved any prompts yet. Use “Save to workspace” on a tool result, or add one with “New prompt”.") : "No prompts match your search."}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((p) => {
            const open = openId === p.id;
            return (
              <li key={p.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <button onClick={() => setOpenId(open ? null : p.id)} className="min-w-0 flex-1 text-left" aria-expanded={open}>
                    <p className="truncate font-bold text-foreground">{p.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {isTeam && <>{p.authorName} · </>}
                      {new Date(p.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      {p.sourceLabel && <> · from {p.sourceLabel}</>}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => copy(p)} title="Copy prompt" aria-label="Copy prompt" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                      {copiedId === p.id ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                    {canEdit(p) && (
                      <>
                        <button onClick={() => { setError(null); setDraft({ id: p.id, title: p.title, content: p.content, tags: p.tags.join(", ") }); }} title="Edit" aria-label="Edit prompt" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(p)} disabled={pending} title="Delete" aria-label="Delete prompt" className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {p.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.tags.map((t) => <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">#{t}</span>)}
                  </div>
                )}
                <pre className={`mt-3 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-muted/50 p-3 font-mono text-xs leading-relaxed ${open ? "max-h-[32rem]" : "max-h-24"}`}>{p.content}</pre>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
