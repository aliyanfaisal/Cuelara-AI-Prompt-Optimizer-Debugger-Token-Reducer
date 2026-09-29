"use client";

import { useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircle2, Headset, Loader2, Mail, Send, X } from "lucide-react";
import { useTurnstile } from "@/components/security/Turnstile";

const FIELD =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50";

const SUPPORT_EMAIL = "support@cuelara.com";

export function SupportWidget() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // null = not yet touched by the person, so the signed-in user's details show through until they type.
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [message, setMessage] = useState("");

  const ts = useTurnstile();

  const nameValue = name ?? (status === "authenticated" ? session?.user?.name ?? "" : "");
  const emailValue = email ?? (status === "authenticated" ? session?.user?.email ?? "" : "");

  // Admin pages have their own inbox view; the /tools pages run their own floating toolbar.
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/tools")) return null;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue, email: emailValue, whatsapp, message, source: "widget", turnstileToken: ts.token }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Something went wrong. Please try again.");
      setSubmitted(true);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      ts.reset(); // a token is single-use
      setSending(false);
    }
  }

  function close() {
    setOpen(false);
    // Give the closing animation a moment before resetting the "sent" view.
    setTimeout(() => setSubmitted(false), 300);
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-40 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm">
          <div className="glass-card rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-9rem)]">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-primary/5">
              <div className="flex items-center gap-2 min-w-0">
                <Headset className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground leading-tight">Need a hand?</p>
                  <p className="text-xs text-muted-foreground truncate">We usually reply within a day.</p>
                </div>
              </div>
              <button
                onClick={close}
                aria-label="Close support widget"
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto">
              {submitted ? (
                <div className="flex flex-col items-center text-center py-6" role="status">
                  <CheckCircle2 className="w-9 h-9 text-emerald-500 mb-3" />
                  <p className="text-sm font-bold text-foreground mb-1">Thanks — you&apos;re all set!</p>
                  <p className="text-xs text-muted-foreground max-w-[220px]">
                    We&apos;ve got your message and will be in touch very soon.
                  </p>
                  <button onClick={() => setSubmitted(false)} className="mt-4 text-xs font-semibold text-primary hover:underline">
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-3">
                  <div>
                    <label htmlFor="support-name" className="mb-1 block text-xs font-semibold text-foreground">Name</label>
                    <input
                      id="support-name"
                      required
                      maxLength={100}
                      autoComplete="name"
                      className={FIELD}
                      placeholder="Your name"
                      value={nameValue}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="support-email" className="mb-1 block text-xs font-semibold text-foreground">Email</label>
                    <input
                      id="support-email"
                      type="email"
                      required
                      maxLength={200}
                      autoComplete="email"
                      className={FIELD}
                      placeholder="you@company.com"
                      value={emailValue}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="support-whatsapp" className="mb-1 block text-xs font-semibold text-foreground">
                      WhatsApp <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <input
                      id="support-whatsapp"
                      type="tel"
                      maxLength={30}
                      autoComplete="tel"
                      className={FIELD}
                      placeholder="+1 555 123 4567"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="support-message" className="mb-1 block text-xs font-semibold text-foreground">Message</label>
                    <textarea
                      id="support-message"
                      required
                      minLength={10}
                      maxLength={5000}
                      rows={4}
                      className={`${FIELD} resize-y`}
                      placeholder="How can we help?"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>

                  {error && (
                    <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">
                      {error}
                    </p>
                  )}

                  {ts.widget}

                  <button
                    type="submit"
                    disabled={sending || ts.blocked}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {sending ? "Sending..." : "Send message"}
                  </button>
                </form>
              )}
            </div>

            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-center justify-center gap-1.5 border-t border-border px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 shrink-0"
            >
              <Mail className="w-3.5 h-3.5" /> Or email us at {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close support" : "Open support"}
        className="fixed bottom-24 right-4 sm:right-6 z-50 p-3.5 rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {open ? <X className="w-5 h-5" /> : <Headset className="w-5 h-5" />}
      </button>
    </>
  );
}
