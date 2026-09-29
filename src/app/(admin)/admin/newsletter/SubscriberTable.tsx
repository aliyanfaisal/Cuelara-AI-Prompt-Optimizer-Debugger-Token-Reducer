"use client";

import { useMemo, useState } from "react";
import { MailCheck, MailX, Rss, Search, Trash2 } from "lucide-react";
import { deleteSubscriber, setSubscriberActive } from "./actions";

export interface SubscriberRow {
  id: string;
  email: string;
  source: string;
  isActive: boolean;
  createdAt: string;
}

export default function SubscriberTable({ initialSubscribers }: { initialSubscribers: SubscriberRow[] }) {
  const [subscribers, setSubscribers] = useState(initialSubscribers);
  const [filter, setFilter] = useState<"all" | "active" | "unsubscribed">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subscribers.filter((s) => {
      if (filter === "active" && !s.isActive) return false;
      if (filter === "unsubscribed" && s.isActive) return false;
      if (!q) return true;
      return s.email.toLowerCase().includes(q);
    });
  }, [subscribers, filter, search]);

  async function toggleActive(id: string, isActive: boolean) {
    setSubscribers((prev) => prev.map((s) => (s.id === id ? { ...s, isActive } : s)));
    const result = await setSubscriberActive(id, isActive);
    if (result.error) {
      setSubscribers((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !isActive } : s)));
      alert(result.error);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this subscriber permanently?")) return;
    const result = await deleteSubscriber(id);
    if (result.error) return alert(result.error);
    setSubscribers((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-border flex flex-wrap items-center gap-3">
        <div className="flex items-center bg-background border border-border rounded-lg px-3 py-2 max-w-xs w-full">
          <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none focus:outline-none w-full text-xs"
          />
        </div>
        <div className="inline-flex p-1 rounded-lg bg-muted border border-border">
          {(["all", "active", "unsubscribed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
                filter === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} shown</span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Rss className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No subscribers here yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((s) => (
            <li key={s.id} className="flex items-center gap-3 p-4">
              <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-foreground truncate">{s.email}</span>
                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase">{s.source}</span>
                {!s.isActive && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase">Unsubscribed</span>
                )}
                <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">{new Date(s.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleActive(s.id, !s.isActive)}
                  title={s.isActive ? "Mark as unsubscribed" : "Mark as active"}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {s.isActive ? <MailX className="w-4 h-4" /> : <MailCheck className="w-4 h-4" />}
                </button>
                <button onClick={() => remove(s.id)} title="Delete" className="p-2 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
