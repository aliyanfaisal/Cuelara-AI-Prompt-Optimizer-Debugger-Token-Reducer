"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useNewsletterSubscribe } from "@/hooks/useNewsletterSubscribe";

export function Footer() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const { status, error, subscribe } = useNewsletterSubscribe("footer");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (website) return; // bots fill the hidden field
    await subscribe(email);
    setEmail("");
  }

  return (
    <footer className="border-t border-border bg-background pt-20 pb-10">
      <div className="container mx-auto px-4 md:px-8">

        {/* Top Section: Newsletter / Mini CTA */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8 pb-12 md:pb-16 border-b border-border/50">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1 md:mb-2">Build better prompts today.</h2>
            <p className="text-sm md:text-base text-muted-foreground">Join the newsletter for weekly prompt engineering tips.</p>
          </div>
          {status === "sent" ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground mt-4 md:mt-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" /> You&apos;re subscribed — check your inbox.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col w-full md:w-auto mt-4 md:mt-0">
              <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 sm:gap-2">
                <input
                  type="email"
                  required
                  maxLength={200}
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full sm:w-auto md:w-64 px-4 py-2 sm:py-2.5 rounded-full border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm sm:text-base"
                />
                {/* Honeypot: hidden from people and assistive tech, bots tend to fill it. */}
                <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                  <label htmlFor="footer-newsletter-website">Website</label>
                  <input id="footer-newsletter-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full sm:w-auto px-6 py-2 sm:py-2.5 rounded-full bg-foreground text-background font-bold hover:scale-105 active:scale-95 transition-all text-sm sm:text-base disabled:opacity-60 disabled:hover:scale-100 inline-flex items-center justify-center gap-2"
                >
                  {status === "sending" && <Loader2 className="w-4 h-4 animate-spin" />}
                  Subscribe
                </button>
              </div>
              {error && <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
            </form>
          )}
        </div>

        {/* Main Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 py-16 border-b border-border/50">
          
          <div className="md:col-span-2 flex flex-col gap-6">
            <Link href="/" aria-label="Cuelara home" className="flex items-center group">
              <Image
                src="/cuelara-logo.png"
                alt="Cuelara"
                width={1200}
                height={184}
                unoptimized
                className="h-8 w-auto transition-transform group-hover:scale-105 origin-left"
              />
            </Link>
            <p className="text-muted-foreground leading-relaxed max-w-sm">
              The professional toolkit for AI power users. Optimize your instructions for maximum understanding, structural clarity, and token efficiency.
            </p>
          </div>
          
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-foreground uppercase tracking-wider text-xs mb-2">Platform</h3>
            <Link href="/tools/prompt-builder" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Prompt Builder</Link>
            <Link href="/tools/token-optimizer" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Token Optimizer</Link>
            <Link href="/tools/context-extractor" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Context Extractor</Link>
            <Link href="/tools/prompt-optimizer" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Prompt Optimizer</Link>
            <Link href="/tools/prompt-debugger" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Prompt Debugger</Link>
            <Link href="/tools/prompt-formatter" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Prompt Formatter</Link>
            <Link href="/tools/site-to-prompt" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Site to Prompt</Link>
            <Link href="/tools/compare-estimate" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Compare & Diff</Link>
            <Link href="/tools/intelligence-score" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Intelligence Score</Link>
          </div>
          
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-foreground uppercase tracking-wider text-xs mb-2">Resources</h3>
            <Link href="/cookbook" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Prompt Cookbook</Link>
            <Link href="/blog" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Blog</Link>
            <Link href="/docs" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">API Documentation</Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Pricing</Link>
          </div>
          
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-foreground uppercase tracking-wider text-xs mb-2">Company</h3>
            <Link href="/about" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">About Us</Link>
            <Link href="/contact" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Contact</Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Privacy Policy</Link>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Terms of Service</Link>
            <Link href="/refund-policy" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Refund Policy</Link>
            <a href="mailto:support@cuelara.com" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">support@cuelara.com</a>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-medium">All systems operational</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Cuelara, Inc. All rights reserved.</p>
        </div>

      </div>
    </footer>
  );
}
