"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useTurnstile } from "@/components/security/Turnstile";

const FIELD =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50";

export function ContactForm({ plan, planName }: { plan?: string; planName?: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const ts = useTurnstile();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setStatus("sending");
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, plan, turnstileToken: ts.token }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Something went wrong. Please try again.");
      form.reset();
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("idle");
    } finally {
      ts.reset(); // a token is single-use
    }
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-12 text-center" role="status">
        <CheckCircle2 className="mb-4 h-10 w-10 text-emerald-500" />
        <h2 className="mb-2 text-xl font-bold text-foreground">Message sent</h2>
        <p className="max-w-sm text-sm text-muted-foreground">Thanks for reaching out. We&apos;ve emailed you a confirmation and will reply as soon as we can.</p>
        <button onClick={() => setStatus("idle")} className="mt-6 text-sm font-semibold text-primary hover:underline">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
      {planName && (
        <p className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground">
          You&apos;re asking about the <strong>{planName}</strong> plan.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-foreground">Name</label>
          <input id="name" name="name" required maxLength={100} autoComplete="name" className={FIELD} placeholder="Your name" />
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-foreground">Email</label>
          <input id="email" name="email" type="email" required maxLength={200} autoComplete="email" className={FIELD} placeholder="you@company.com" />
        </div>
      </div>

      <div>
        <label htmlFor="subject" className="mb-1.5 block text-sm font-semibold text-foreground">Subject <span className="font-normal text-muted-foreground">(optional)</span></label>
        <input
          id="subject"
          name="subject"
          maxLength={150}
          defaultValue={planName ? `${planName} plan enquiry` : ""}
          className={FIELD}
          placeholder="How can we help?"
        />
      </div>

      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-semibold text-foreground">Message</label>
        <textarea id="message" name="message" required minLength={10} maxLength={5000} rows={6} className={`${FIELD} resize-y`} placeholder="Tell us a little about what you need." />
      </div>

      {/* Honeypot: hidden from people and assistive tech, bots tend to fill it. */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      {ts.widget}

      <button
        type="submit"
        disabled={status === "sending" || ts.blocked}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {status === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {status === "sending" ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
