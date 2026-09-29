"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { useNewsletterSubscribe } from "@/hooks/useNewsletterSubscribe";

export function NewsletterCta() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const { status, error, subscribe } = useNewsletterSubscribe("blog");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (website) return; // bots fill the hidden field
    await subscribe(email);
    setEmail("");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="mt-24 rounded-3xl bg-gradient-to-r from-primary/30 via-violet-500/30 to-primary/30 p-1"
    >
      <div className="relative overflow-hidden rounded-[22px] bg-card p-8 text-center md:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(var(--foreground)_1px,transparent_1px)] opacity-[0.03] [background-size:20px_20px]" />

        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mb-4 text-3xl font-bold text-foreground">Stay ahead of the curve</h3>
          <p className="mb-8 text-muted-foreground">
            Get the latest prompt engineering strategies, token optimization tricks, and platform updates delivered straight to your inbox once a month. No spam.
          </p>

          {status === "sent" ? (
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" /> You&apos;re subscribed — check your inbox.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 rounded-xl border border-border bg-background px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
                maxLength={200}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {/* Honeypot: hidden from people and assistive tech, bots tend to fill it. */}
              <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                <label htmlFor="blog-newsletter-website">Website</label>
                <input id="blog-newsletter-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
              <button
                type="submit"
                disabled={status === "sending"}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
              >
                {status === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
                Subscribe
              </button>
            </form>
          )}
          {error && <p role="alert" className="mt-3 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        </div>
      </div>
    </motion.div>
  );
}
