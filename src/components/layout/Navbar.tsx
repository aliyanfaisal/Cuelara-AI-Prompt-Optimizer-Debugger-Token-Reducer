"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TerminalSquare, BookOpen, Layers, Menu, X, ChevronDown, Zap, Code2, ShieldCheck, Terminal, ArrowRight, FileText } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

const TOOLS_MENU = [
  { name: "Token Optimizer", icon: <Zap className="w-4 h-4 text-amber-500" />, href: "/tools/token-optimizer" },
  { name: "Context Extractor", icon: <FileText className="w-4 h-4 text-primary" />, href: "/tools/context-extractor" },
  { name: "Prompt Optimizer", icon: <Code2 className="w-4 h-4 text-primary" />, href: "/tools/prompt-optimizer" },
  { name: "Prompt Debugger", icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />, href: "/tools/prompt-debugger" },
  { name: "Prompt Formatter", icon: <Terminal className="w-4 h-4 text-pink-500" />, href: "/tools/prompt-formatter" },
  { name: "Intelligence Score", icon: <Sparkles className="w-4 h-4 text-violet-500" />, href: "/tools/intelligence-score" },
  { name: "Diff & Cost Estimate", icon: <ArrowRight className="w-4 h-4 text-blue-500" />, href: "/tools/compare-estimate" },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isToolsHovered, setIsToolsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center mt-4 sm:mt-6 px-4 pointer-events-none">
        <motion.header 
          initial={{ width: "80px", opacity: 0, borderRadius: "100px" }}
          animate={{ width: "100%", maxWidth: "896px", opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          onAnimationComplete={() => setIsLoaded(true)}
          className={`pointer-events-auto border border-border bg-background/80 backdrop-blur-xl shadow-xl py-2 px-3 sm:py-3 sm:px-6 flex items-center justify-between relative ${isLoaded ? 'overflow-visible' : 'overflow-hidden'}`}
        >
          {isLoaded && (
            <>
              {/* Logo */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <Link href="/" className="flex items-center space-x-2 group z-50 pl-2 sm:pl-0">
                  <div className="bg-primary/10 p-1.5 sm:p-2 rounded-full border border-primary/20 transition-transform group-hover:scale-110">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <span className="font-bold text-base sm:text-lg tracking-tight text-foreground">
                    Cuelara
                  </span>
                </Link>
              </motion.div>

              {/* Desktop Navigation */}
              <motion.nav 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="hidden md:flex items-center space-x-8 text-sm font-medium absolute left-1/2 -translate-x-1/2 h-full"
              >
                
                {/* Tools Mega Menu Trigger */}
                <div 
                  className="h-full flex items-center"
                  onMouseEnter={() => setIsToolsHovered(true)}
                  onMouseLeave={() => setIsToolsHovered(false)}
                >
                  <button className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 h-full px-2">
                    <TerminalSquare className="h-4 w-4 opacity-70" />
                    Tools
                    <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isToolsHovered ? "rotate-180" : ""}`} />
                  </button>
                  
                  {/* Mega Menu Dropdown */}
                  <AnimatePresence>
                    {isToolsHovered && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 pt-4"
                      >
                        <div className="w-[500px] bg-background border border-border rounded-2xl shadow-2xl p-4 grid grid-cols-2 gap-2 relative">
                          {TOOLS_MENU.map((tool, idx) => (
                            <Link 
                              key={idx} 
                              href={tool.href}
                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group/item"
                            >
                              <div className="p-2 rounded-lg bg-background border border-border shadow-sm group-hover/item:scale-110 transition-transform">
                                {tool.icon}
                              </div>
                              <span className="font-semibold text-sm text-foreground">{tool.name}</span>
                            </Link>
                          ))}
                          <div className="col-span-2 mt-2 pt-4 border-t border-border flex justify-between items-center px-2">
                            <span className="text-xs text-muted-foreground font-medium">All tools are powered by our core optimization engine.</span>
                            <Link href="/tools" className="text-xs font-bold text-primary hover:underline flex items-center">
                              View All <ArrowRight className="w-3 h-3 ml-1" />
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Link href="/cookbook" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                  <BookOpen className="h-4 w-4 opacity-70" />
                  Cookbook
                </Link>
                <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                  <Layers className="h-4 w-4 opacity-70" />
                  Blog
                </Link>
              </motion.nav>

              {/* Desktop CTA */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="hidden md:flex items-center gap-2"
              >
                {status === "loading" ? (
                  <div className="h-9 w-24 bg-muted animate-pulse rounded-full" />
                ) : session ? (
                  <>
                    <Link
                      href={(session.user as any)?.roles?.includes("ADMIN") ? "/admin/dashboard" : "/tools"}
                      className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-2"
                    >
                      {(session.user as any)?.roles?.includes("ADMIN") ? "Admin Dashboard" : "Dashboard"}
                    </Link>
                    <button
                      onClick={() => signOut()}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-muted px-4 text-sm font-semibold text-foreground transition-all hover:bg-muted/80"
                    >
                      Log Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-3"
                    >
                      Log in
                    </Link>
                    <Link
                      href="/register"
                      className="inline-flex h-9 sm:h-10 items-center justify-center rounded-full bg-primary px-5 sm:px-6 text-sm font-bold text-primary-foreground shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] transition-all hover:bg-primary/90 hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 whitespace-nowrap"
                    >
                      Sign up free
                    </Link>
                  </>
                )}
              </motion.div>

              {/* Mobile Menu Toggle */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="flex md:hidden items-center z-50"
              >
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-full bg-muted/50 text-foreground transition-colors hover:bg-muted"
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </motion.div>
            </>
          )}
        </motion.header>
      </div>

      {/* Mobile Fullscreen Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-background/95 backdrop-blur-3xl pt-24 px-6 flex flex-col md:hidden overflow-y-auto"
          >
            <div className="flex flex-col gap-4">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Platform</div>
              <div className="grid grid-cols-1 gap-1 border-b border-border/50 pb-4">
                {TOOLS_MENU.map((tool, idx) => (
                  <Link 
                    key={idx} 
                    href={tool.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted transition-colors"
                  >
                    <div className="p-1.5 rounded-lg bg-background border border-border shadow-sm">
                      {tool.icon}
                    </div>
                    <span className="font-semibold text-base text-foreground">{tool.name}</span>
                  </Link>
                ))}
              </div>
              
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-2">Resources</div>
              <Link href="/cookbook" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 text-base font-bold text-foreground py-2 px-2 hover:bg-muted rounded-xl transition-colors">
                <BookOpen className="h-4 w-4 text-muted-foreground" /> Cookbook
              </Link>
              <Link href="/blog" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 text-base font-bold text-foreground py-2 px-2 hover:bg-muted rounded-xl transition-colors">
                <Layers className="h-4 w-4 text-muted-foreground" /> Blog
              </Link>
            </div>

            <div className="mt-8 mb-12 flex flex-col gap-3">
              {status === "loading" ? (
                <div className="h-12 w-full bg-muted animate-pulse rounded-full" />
              ) : session ? (
                <>
                  <Link
                    href={(session.user as any)?.roles?.includes("ADMIN") ? "/admin/dashboard" : "/tools"}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex w-full h-12 items-center justify-center rounded-full bg-primary px-8 text-base font-bold text-primary-foreground shadow-lg transition-all active:scale-95"
                  >
                    {(session.user as any)?.roles?.includes("ADMIN") ? "Admin Dashboard" : "Dashboard"}
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex w-full h-12 items-center justify-center rounded-full bg-muted px-8 text-base font-bold text-foreground transition-all active:scale-95"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex w-full h-12 items-center justify-center rounded-full bg-primary px-8 text-base font-bold text-primary-foreground shadow-lg transition-all active:scale-95"
                  >
                    Sign up free
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex w-full h-12 items-center justify-center rounded-full bg-muted px-8 text-base font-bold text-foreground transition-all active:scale-95"
                  >
                    Log in
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
