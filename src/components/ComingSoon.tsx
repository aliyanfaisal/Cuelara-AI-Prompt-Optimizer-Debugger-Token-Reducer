import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";

export function ComingSoon({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <section className="relative flex min-h-[70vh] w-full items-center justify-center overflow-hidden px-6 py-32">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[360px] w-[700px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-xl text-center">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm [&_svg]:h-9 [&_svg]:w-9">
          {icon}
        </div>

        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-amber-500" /> Coming Soon
        </div>

        <h1 className="mb-4 text-4xl font-black tracking-tight text-foreground md:text-5xl">{title}</h1>
        <p className="mb-10 text-lg leading-relaxed text-muted-foreground">{description}</p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-background/50 px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to home
          </Link>
          <Link
            href="/tools"
            className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-sm font-bold text-background shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            Explore the tools <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
