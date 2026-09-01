import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background pt-20 pb-10">
      <div className="container mx-auto px-4 md:px-8">
        
        {/* Top Section: Newsletter / Mini CTA */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8 pb-12 md:pb-16 border-b border-border/50">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1 md:mb-2">Build better prompts today.</h2>
            <p className="text-sm md:text-base text-muted-foreground">Join the newsletter for weekly prompt engineering tips.</p>
          </div>
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 sm:gap-2 mt-4 md:mt-0">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="w-full sm:w-auto md:w-64 px-4 py-2 sm:py-2.5 rounded-full border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm sm:text-base"
            />
            <button className="w-full sm:w-auto px-6 py-2 sm:py-2.5 rounded-full bg-foreground text-background font-bold hover:scale-105 active:scale-95 transition-all text-sm sm:text-base">
              Subscribe
            </button>
          </div>
        </div>

        {/* Main Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 py-16 border-b border-border/50">
          
          <div className="md:col-span-2 flex flex-col gap-6">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="bg-primary/10 p-2 rounded-xl border border-primary/20 group-hover:bg-primary/20 transition-colors">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold text-2xl tracking-tight">Cuelara</span>
            </Link>
            <p className="text-muted-foreground leading-relaxed max-w-sm">
              The professional toolkit for AI power users. Optimize your instructions for maximum understanding, structural clarity, and token efficiency.
            </p>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              {/* Twitter / X */}
              <a href="#" className="hover:text-foreground transition-colors p-2 bg-muted/30 rounded-full hover:bg-muted">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              {/* GitHub */}
              <a href="#" className="hover:text-foreground transition-colors p-2 bg-muted/30 rounded-full hover:bg-muted">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
              </a>
              {/* LinkedIn */}
              <a href="#" className="hover:text-foreground transition-colors p-2 bg-muted/30 rounded-full hover:bg-muted">
                 <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-foreground uppercase tracking-wider text-xs mb-2">Platform</h3>
            <Link href="/tools/token-optimizer" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Token Optimizer</Link>
            <Link href="/tools/context-extractor" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Context Extractor</Link>
            <Link href="/tools/prompt-optimizer" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Prompt Optimizer</Link>
            <Link href="/tools/prompt-debugger" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Prompt Debugger</Link>
            <Link href="/tools/prompt-formatter" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Prompt Formatter</Link>
            <Link href="/tools/compare-estimate" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Compare & Diff</Link>
            <Link href="/tools/intelligence-score" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Intelligence Score</Link>
          </div>
          
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-foreground uppercase tracking-wider text-xs mb-2">Resources</h3>
            <Link href="/cookbook" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Prompt Cookbook</Link>
            <Link href="/blog" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Blog</Link>
            <Link href="/docs" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">API Documentation</Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Pricing</Link>
            <Link href="/changelog" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all flex items-center gap-2">
              Changelog <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">New</span>
            </Link>
          </div>
          
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-foreground uppercase tracking-wider text-xs mb-2">Company</h3>
            <Link href="/about" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">About Us</Link>
            <Link href="/contact" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Contact</Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Privacy Policy</Link>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all">Terms of Service</Link>
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
