import Link from "next/link";
import { Sparkles, TerminalSquare, BookOpen, Layers } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-8">
        <Link href="/" className="mr-8 flex items-center space-x-2">
          <div className="bg-primary/10 p-1.5 rounded-lg border border-primary/20">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <span className="hidden font-bold sm:inline-block text-xl tracking-tight">
            Cuelara
          </span>
        </Link>
        <nav className="flex flex-1 items-center space-x-6 text-sm font-medium">
          <Link
            href="/tools"
            className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2"
          >
            <TerminalSquare className="h-4 w-4" />
            Tools
          </Link>
          <Link
            href="/cookbook"
            className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Cookbook
          </Link>
          <Link
            href="/blog"
            className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2"
          >
            <Layers className="h-4 w-4" />
            Blog
          </Link>
        </nav>
        <div className="flex items-center space-x-4">
          <Link
            href="/tools"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            Optimize a Prompt
          </Link>
        </div>
      </div>
    </header>
  );
}
