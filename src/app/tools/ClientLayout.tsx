"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Zap, Code2, ShieldCheck, 
  Terminal, Sparkles, ArrowRight, ChevronLeft, ChevronRight, 
  FileText, Maximize2, Minimize2, Sun, Moon, 
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  X
} from "lucide-react";

const NAVIGATION = [
  { name: "Overview", href: "/tools", icon: LayoutDashboard },
  { name: "Context Extractor", href: "/tools/context-extractor", icon: FileText },
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

const SIDEBAR_W = 260; 
const RIGHT_SIDEBAR_W = 260; 

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  // Desktop sidebar collapse states
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);

  // Mobile sidebar drawer states
  const [isMobileLeftOpen, setIsMobileLeftOpen] = useState(false);
  const [isMobileRightOpen, setIsMobileRightOpen] = useState(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Toggle fullscreen mode: toggles both sidebars to expand full canvas + triggers browser fullscreen
  const toggleFullscreen = () => {
    if (isLeftOpen || isRightOpen) {
      // Enter Fullscreen: collapse both sidebars for maximum workspace
      setIsLeftOpen(false);
      setIsRightOpen(false);
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      // Exit Fullscreen: restore both sidebars
      setIsLeftOpen(true);
      setIsRightOpen(true);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const isFocusMode = !isLeftOpen && !isRightOpen;

  return (
    <div className="flex min-h-screen bg-background relative selection:bg-primary/20">
      
      {/* ---------------- MOBILE DRAWERS & BACKDROPS ---------------- */}
      
      {/* Mobile Left Drawer Backdrop */}
      <AnimatePresence>
        {isMobileLeftOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileLeftOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Right Drawer Backdrop */}
      <AnimatePresence>
        {isMobileRightOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm xl:hidden"
            onClick={() => setIsMobileRightOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Left Sidebar Drawer */}
      <AnimatePresence>
        {isMobileLeftOpen && (
          <motion.aside
            initial={{ x: -SIDEBAR_W }}
            animate={{ x: 0 }}
            exit={{ x: -SIDEBAR_W }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border shadow-2xl lg:hidden"
            style={{ width: SIDEBAR_W }}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">Prompt Toolkit</span>
              <button 
                onClick={() => setIsMobileLeftOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Close Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {NAVIGATION.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                    onClick={() => setIsMobileLeftOpen(false)}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground/70"}`} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile Right Sidebar Drawer */}
      <AnimatePresence>
        {isMobileRightOpen && (
          <motion.aside
            initial={{ x: RIGHT_SIDEBAR_W }}
            animate={{ x: 0 }}
            exit={{ x: RIGHT_SIDEBAR_W }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 right-0 z-50 flex flex-col bg-card border-l border-border shadow-2xl xl:hidden"
            style={{ width: RIGHT_SIDEBAR_W }}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">Assistant Hub</span>
              <button 
                onClick={() => setIsMobileRightOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Close Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Getting Started */}
              <section>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  Quick Steps
                </p>
                <ol className="space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                    <span>Pick a tool from the toolkit</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                    <span>Paste your prompt instructions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                    <span>Copy optimized, token-efficient output</span>
                  </li>
                </ol>
              </section>

              {/* Quick Links */}
              <section>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Quick Links
                </p>
                <div className="space-y-1">
                  {QUICK_LINKS.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      onClick={() => setIsMobileRightOpen(false)}
                    >
                      {link.label}
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ---------------- MOBILE TRIGGER BUTTONS (EDGES) ---------------- */}
      
      {/* Left Mobile Edge Trigger */}
      <button 
        className="lg:hidden fixed left-0 top-1/2 -translate-y-1/2 z-30 bg-card/90 backdrop-blur border border-border border-l-0 rounded-r-xl p-2 shadow-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
        onClick={() => setIsMobileLeftOpen(true)}
        aria-label="Open Left Sidebar"
        title="Open Toolkit Menu"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Right Mobile Edge Trigger */}
      <button 
        className="xl:hidden fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-card/90 backdrop-blur border border-border border-r-0 rounded-l-xl p-2 shadow-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
        onClick={() => setIsMobileRightOpen(true)}
        aria-label="Open Right Sidebar"
        title="Open Assistant Menu"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>


      {/* ---------------- DESKTOP LEFT SIDEBAR ---------------- */}
      <AnimatePresence initial={false}>
        {isLeftOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: SIDEBAR_W, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="shrink-0 flex-col bg-card border-r border-border sticky top-0 h-screen z-20 hidden lg:flex overflow-hidden select-none"
            style={{ width: SIDEBAR_W }}
          >
            <div className="w-[260px] flex flex-col h-full">
              {/* Header & Collapse Button */}
              <div className="pt-20 px-4 pb-3 flex items-center justify-between border-b border-border/40">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  Prompt Toolkit
                </p>
                <button
                  onClick={() => setIsLeftOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Collapse Sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
              
              {/* Navigation List */}
              <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {NAVIGATION.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-primary/10 text-primary font-bold shadow-sm"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground/70"}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}

                {/* More coming */}
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-muted-foreground/50 border border-dashed border-border/60 bg-muted/10 mt-4 cursor-default">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse shrink-0" />
                  <span>More tools coming...</span>
                </div>
              </div>

              {/* Upgrade Promo Footer */}
              <div className="px-3 pb-6 pt-3 border-t border-border/40 bg-card">
                <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-center">
                  <Sparkles className="w-4 h-4 text-primary mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-foreground mb-0.5">Cuelara Pro</p>
                  <p className="text-[11px] text-muted-foreground mb-2.5 leading-relaxed">
                    Custom workspaces & prompt history.
                  </p>
                  <button className="w-full py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
                    Upgrade
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Left Re-open Tab (when collapsed) */}
      {!isLeftOpen && (
        <button
          onClick={() => setIsLeftOpen(true)}
          className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-30 bg-card/90 backdrop-blur-md border border-border border-l-0 rounded-r-xl p-2.5 shadow-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all hover:pl-3.5 group"
          title="Expand Left Sidebar (Toolkit)"
        >
          <PanelLeftOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>
      )}


      {/* ---------------- MAIN CANVAS AREA ---------------- */}
      <main 
        data-fullscreen={isFocusMode || isFullscreen}
        className="flex-1 min-w-0 pt-20 pb-16 overflow-x-hidden flex flex-col justify-start items-center transition-all duration-300"
      >
        <div className={`w-full px-4 sm:px-6 transition-all duration-300 ${
          isFocusMode || isFullscreen ? "max-w-[1280px]" : "max-w-4xl"
        }`}>
          {children}
        </div>
      </main>


      {/* ---------------- DESKTOP RIGHT SIDEBAR ---------------- */}
      <AnimatePresence initial={false}>
        {isRightOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: RIGHT_SIDEBAR_W, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="shrink-0 flex-col bg-card border-l border-border sticky top-0 h-screen z-20 hidden xl:flex overflow-hidden select-none"
            style={{ width: RIGHT_SIDEBAR_W }}
          >
            <div className="w-[260px] flex flex-col h-full">
              {/* Header & Collapse Button */}
              <div className="pt-20 px-4 pb-3 flex items-center justify-between border-b border-border/40">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  Assistant Hub
                </p>
                <button
                  onClick={() => setIsRightOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Collapse Sidebar"
                >
                  <PanelRightClose className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                {/* User Snapshot */}
                <section className="bg-muted/30 p-3.5 rounded-xl border border-border/60">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                      AR
                      <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border-2 border-card rounded-full" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">Alex Rivera</p>
                      <p className="text-[10px] text-muted-foreground truncate">Pro Engineer</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 border-t border-border/50 pt-2.5 text-[10px]">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Monthly Tokens</span>
                      <span className="font-semibold text-foreground">42.8k / 100k</span>
                    </div>
                    <div className="w-full bg-border rounded-full h-1">
                      <div className="bg-primary h-1 rounded-full" style={{ width: "42.8%" }} />
                    </div>
                    <div className="flex justify-between items-center pt-0.5">
                      <span className="text-muted-foreground">Avg Prompt Score</span>
                      <span className="font-bold text-emerald-500">92 / 100</span>
                    </div>
                  </div>
                </section>

                {/* Getting Started Steps */}
                <section>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                    Workflow Guide
                  </p>
                  <ol className="space-y-2.5">
                    {[
                      "Pick a tool from the left toolkit.",
                      "Paste instructions in the editor.",
                      "Copy optimized, structured prompt.",
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-4 h-4 shrink-0 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-xs text-muted-foreground leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </section>

                <div className="border-t border-border/50" />

                {/* Quick Recipes */}
                <section>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">
                    Cookbook Quick Links
                  </p>
                  <div className="space-y-0.5">
                    {QUICK_LINKS.map((link) => (
                      <Link
                        key={link.label}
                        href={link.href}
                        className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors group"
                      >
                        <span>{link.label}</span>
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                      </Link>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Right Re-open Tab (when collapsed) */}
      {!isRightOpen && (
        <button
          onClick={() => setIsRightOpen(true)}
          className="hidden xl:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-card/90 backdrop-blur-md border border-border border-r-0 rounded-l-xl p-2.5 shadow-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all hover:pr-3.5 group"
          title="Expand Right Sidebar (Assistant)"
        >
          <PanelRightOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>
      )}


      {/* ---------------- CLEAN FLOATING TOOLBAR (FULLSCREEN & THEME TOGGLES) ---------------- */}
      {mounted && (
        <aside
          aria-label="Quick Controls"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-1 p-1 bg-card/90 backdrop-blur-md border border-border shadow-xl rounded-full"
        >
          {/* Fullscreen Mode / Sidebars Toggle */}
          <button
            onClick={toggleFullscreen}
            className={`p-2.5 rounded-full transition-all text-xs ${
              isFocusMode || isFullscreen
                ? 'text-primary bg-primary/10 shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title={isFocusMode ? "Exit Fullscreen (Restore Sidebars)" : "Fullscreen Mode (Collapse Sidebars)"}
          >
            {isFocusMode || isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-primary" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          <div className="w-px h-4 bg-border my-auto" />

          {/* Theme Toggle (Dark / Light) */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full transition-all text-muted-foreground hover:text-foreground hover:bg-muted"
            title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
          </button>
        </aside>
      )}

    </div>
  );
}
