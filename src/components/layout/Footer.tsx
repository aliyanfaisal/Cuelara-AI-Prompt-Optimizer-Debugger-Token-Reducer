import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background py-12 md:py-16">
      <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-start gap-8">
        <div className="flex flex-col gap-4 max-w-sm">
          <Link href="/" className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-bold text-xl tracking-tight">Cuelara</span>
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The professional toolkit for AI power users. Optimize your prompts for maximum understanding, structural clarity, and token efficiency.
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-12 sm:grid-cols-3">
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold">Tools</h3>
            <Link href="/tools" className="text-sm text-muted-foreground hover:text-foreground">Prompt Optimizer</Link>
            <Link href="/tools" className="text-sm text-muted-foreground hover:text-foreground">Token Reducer</Link>
            <Link href="/tools" className="text-sm text-muted-foreground hover:text-foreground">Debugger</Link>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold">Resources</h3>
            <Link href="/cookbook" className="text-sm text-muted-foreground hover:text-foreground">Prompt Cookbook</Link>
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">Blog</Link>
            <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground">API Docs</Link>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold">Company</h3>
            <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">About</Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms</Link>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 md:px-8 mt-12 pt-8 border-t border-border/40 text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Cuelara. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
