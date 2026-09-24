"use client";

import { useMemo, useState } from "react";
import { Inbox, MailCheck, MailOpen, Search, Trash2, TriangleAlert } from "lucide-react";
import { deleteMessage, setMessageRead } from "./actions";

export interface MessageRow {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  plan: string | null;
  isRead: boolean;
  emailSent: boolean;
  createdAt: string;
}

export default function MessagesTable({ initialMessages }: { initialMessages: MessageRow[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (filter === "unread" && m.isRead) return false;
      if (!q) return true;
      return [m.name, m.email, m.subject ?? "", m.message].some((v) => v.toLowerCase().includes(q));
    });
  }, [messages, filter, search]);

  async function toggleRead(id: string, isRead: boolean) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isRead } : m)));
    const result = await setMessageRead(id, isRead);
    if (result.error) {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isRead: !isRead } : m)));
      alert(result.error);
    }
  }

  function open(m: MessageRow) {
    const next = openId === m.id ? null : m.id;
    setOpenId(next);
    // Opening an unread message marks it read.
    if (next && !m.isRead) void toggleRead(m.id, true);
  }

  async function remove(id: string) {
    if (!confirm("Delete this message permanently?")) return;
    const result = await deleteMessage(id);
    if (result.error) return alert(result.error);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-border flex flex-wrap items-center gap-3">
        <div className="flex items-center bg-background border border-border rounded-lg px-3 py-2 max-w-xs w-full">
          <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search name, email or text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none focus:outline-none w-full text-xs"
          />
        </div>
        <div className="inline-flex p-1 rounded-lg bg-muted border border-border">
          {(["all", "unread"] as const).map((s) => (
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
          <Inbox className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No messages here yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((m) => (
            <li key={m.id} className={m.isRead ? "" : "bg-primary/5"}>
              <div className="flex items-start gap-3 p-4">
                <button onClick={() => open(m)} className="flex-1 min-w-0 text-left">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {!m.isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0" aria-label="Unread" />}
                    <span className="text-sm font-semibold text-foreground">{m.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">{m.email}</span>
                    {m.plan && <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase">{m.plan}</span>}
                    {!m.emailSent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400" title="The notification email did not go out. Check the Emails page.">
                        <TriangleAlert className="w-3 h-3" /> email not sent
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">{new Date(m.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/90 truncate">{m.subject || "(no subject)"}</p>
                  {openId === m.id ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm text-foreground bg-background border border-border rounded-xl p-4">{m.message}</p>
                  ) : (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{m.message}</p>
                  )}
                  {openId === m.id && (
                    <a
                      href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "your message to Cuelara"}`)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                    >
                      <MailCheck className="w-3.5 h-3.5" /> Reply by email
                    </a>
                  )}
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleRead(m.id, !m.isRead)}
                    title={m.isRead ? "Mark as unread" : "Mark as read"}
                    className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <MailOpen className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(m.id)} title="Delete" className="p-2 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
