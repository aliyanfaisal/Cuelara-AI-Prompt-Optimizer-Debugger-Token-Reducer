"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Zap, Code2, ShieldCheck, 
  Terminal, Sparkles, ArrowRight, ChevronLeft, ChevronRight 
} from "lucide-react";

const NAVIGATION = [
  { name: "Overview", href: "/tools", icon: LayoutDashboard },
  { name: "Token Optimizer", href: "/tools/token-optimizer", icon: Zap },
  { name: "Prompt Optimizer", href: "/tools/prompt-optimizer", icon: Code2 },
  { name: "Prompt Debugger", href: "/tools/prompt-debugger", icon: ShieldCheck },
  { name: "Prompt Formatter", href: "/tools/prompt-formatter", icon: Terminal },
  { name: "Intelligence Score", href: "/tools/intelligence-score", icon: Sparkles },
  { name: "Diff & Cost Estimate", href: "/tools/compare-estimate", icon: ArrowRight },
];

const QUICK_LINKS = [
  { label: "ChatGPT Prompts", href: "/cookbook" },
  { label: "Claude Prompts", href: "/cookbook" },
  { label: "React Dev Prompts", href: "/cookbook" },
  { label: "Browse All Recipes", href: "/cookbook" },
  { label: "Engineering Blog", href: "/blog" },
];

const SIDEBAR_W = 256; 
const RIGHT_SIDEBAR_W = 256; 

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [activeSidebar, setActiveSidebar] = useState<'left' | 'right' | null>(null);

  return (
    <div className="flex min-h-screen bg-background relative">
      
      {/* Mobile Backdrops */}
      {activeSidebar === 'left' && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setActiveSidebar(null)}
        />
      )}
      {activeSidebar === 'right' && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm xl:hidden"
          onClick={() => setActiveSidebar(null)}
        />
      )}

      {/* Left Sidebar Toggle Button */}
      <button 
        className="lg:hidden fixed left-0 top-1/2 -translate-y-1/2 z-40 bg-card border border-border border-l-0 rounded-r-2xl p-2.5 shadow-xl flex items-center justify-center transition-transform"
        onClick={() => setActiveSidebar(activeSidebar === 'left' ? null : 'left')}
        aria-label="Toggle Left Sidebar"
      >
        {activeSidebar === 'left' ? (
          <ChevronLeft className="w-5 h-5 text-foreground" />
        ) : (
          <ChevronRight className="w-5 h-5 text-foreground" />
        )}
      </button>

      {/* Right Sidebar Toggle Button */}
      <button 
        className="xl:hidden fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-card border border-border border-r-0 rounded-l-2xl p-2.5 shadow-xl flex items-center justify-center transition-transform"
        onClick={() => setActiveSidebar(activeSidebar === 'right' ? null : 'right')}
        aria-label="Toggle Right Sidebar"
      >
        {activeSidebar === 'right' ? (
          <ChevronRight className="w-5 h-5 text-foreground" />
        ) : (
          <ChevronLeft className="w-5 h-5 text-foreground" />
        )}
      </button>

      {/* LEFT SIDEBAR */}
      <aside
        className={`shrink-0 flex-col bg-card border-r border-border fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:z-0 flex ${
          activeSidebar === 'left' ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: SIDEBAR_W }}
      >
        <div className="flex-1 overflow-y-auto pt-20 px-3 pb-4">
          <div className="flex items-center justify-between px-2 mb-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Prompt Toolkit
            </p>
            {/* Close button inside sidebar for mobile */}
            <button className="lg:hidden text-muted-foreground hover:text-foreground" onClick={() => setActiveSidebar(null)}>
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
          
          <nav className="space-y-1.5">
            {NAVIGATION.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                  onClick={() => setActiveSidebar(null)}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground/70"}`} />
                  {item.name}
                </Link>
              );
            })}

            {/* "More coming" indicator */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground/50 border border-dashed border-border/60 bg-muted/10 mt-4 cursor-default">
              <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
              </div>
              More tools coming...
            </div>
          </nav>
        </div>

        {/* Pro card */}
        <div className="px-3 pb-6 pt-4 border-t border-border bg-card">
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-center">
            <Sparkles className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-xs font-bold text-foreground mb-1">Cuelara Pro</p>
            <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
              API access & saved workspaces.
            </p>
            <button className="w-full py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors">
              Upgrade
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 pt-24 pb-12 overflow-x-hidden flex flex-col justify-center">
        {children}
      </main>

      {/* RIGHT SIDEBAR */}
      <aside
        className={`shrink-0 flex-col bg-card border-l border-border fixed inset-y-0 right-0 z-50 transform transition-transform duration-300 ease-in-out xl:translate-x-0 xl:sticky xl:top-0 xl:h-screen xl:z-0 flex ${
          activeSidebar === 'right' ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: RIGHT_SIDEBAR_W }}
      >
        <div className="flex-1 overflow-y-auto pt-20 px-4 pb-4 flex flex-col gap-6">
          
          {/* User profile section */}
          <section className="bg-muted/30 p-4 rounded-xl border border-border/60 relative">
            {/* Close button for mobile inside right sidebar */}
            <button className="xl:hidden absolute right-3 top-3 text-muted-foreground hover:text-foreground" onClick={() => setActiveSidebar(null)}>
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                AR
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-card rounded-full" />
              </div>
              <div className="min-w-0 pr-6">
                <p className="text-xs font-bold text-foreground truncate">Alex Rivera</p>
                <p className="text-[10px] text-muted-foreground truncate">Pro Engineer</p>
              </div>
            </div>
            
            <div className="space-y-2 border-t border-border/50 pt-3">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-muted-foreground">Workspaces</span>
                <span className="font-semibold text-foreground">4 / 10</span>
              </div>
              <div className="w-full bg-border rounded-full h-1">
                <div className="bg-primary h-1 rounded-full" style={{ width: "40%" }} />
              </div>
              
              <div className="flex justify-between items-center text-[10px] pt-1">
                <span className="text-muted-foreground">Monthly Tokens</span>
                <span className="font-semibold text-foreground">42.8k / 100k</span>
              </div>
              <div className="w-full bg-border rounded-full h-1">
                <div className="bg-primary h-1 rounded-full" style={{ width: "42.8%" }} />
              </div>

              <div className="flex justify-between items-center text-[10px] pt-1">
                <span className="text-muted-foreground">Avg. Prompt Score</span>
                <span className="font-bold text-emerald-500">92/100</span>
              </div>
            </div>
          </section>

          {/* Getting Started */}
          <section>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
              Getting Started
            </p>
            <ol className="space-y-3">
              {[
                "Pick a tool from the left sidebar.",
                "Paste your raw prompt in the input area.",
                "Get instant, optimized results.",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 shrink-0 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-xs text-muted-foreground leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <div className="border-t border-border" />

          {/* Quick Links */}
          <section>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
              Quick Links
            </p>
            <div className="space-y-0.5">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="flex items-center justify-between py-2 px-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors group"
                >
                  {link.label}
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
