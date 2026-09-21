"use client";

import { motion } from "framer-motion";
import { Mail } from "lucide-react";

export function NewsletterCta() {
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

          <form className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 rounded-xl border border-border bg-background px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
            <button
              type="submit"
              className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
