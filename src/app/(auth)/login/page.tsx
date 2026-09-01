"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sparkles, Mail, Lock, ArrowRight, AlertCircle, Sparkle, Code2, Terminal, ShieldCheck, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const error = searchParams?.get("error");
  const success = searchParams?.get("success");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        router.replace(`/login?error=${encodeURIComponent(res.error)}`);
      } else if (res?.ok) {
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        
        if (session?.user?.roles?.includes("ADMIN")) {
          router.push("/admin/dashboard");
        } else {
          router.push("/tools");
        }
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center pt-32 pb-12 px-6 lg:px-8 bg-grid-pattern bg-background overflow-hidden">
      
      {/* Background Glow Effects from Landing Page */}
      <div className="absolute top-[-10%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-primary/10 blur-[120px] dark:blur-[150px] mix-blend-multiply dark:mix-blend-screen pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[30vw] h-[30vw] rounded-full bg-accent/10 blur-[100px] dark:blur-[120px] mix-blend-multiply dark:mix-blend-screen pointer-events-none" />

      {/* Floating Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block z-0">
        <motion.div
          animate={{ y: [0, -15, 0], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[15%] left-[12%] w-16 h-16 bg-primary/10 rounded-2xl backdrop-blur-md border border-primary/20 shadow-[0_0_30px_rgba(79,70,229,0.15)] flex items-center justify-center -rotate-12"
        >
          <Sparkles className="w-6 h-6 text-primary/50" />
        </motion.div>
        
        <motion.div
          animate={{ y: [0, 20, 0], rotate: [0, -15, 5, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-[20%] right-[15%] w-20 h-20 bg-accent/10 rounded-full backdrop-blur-md border border-accent/20 shadow-[0_0_40px_rgba(236,72,153,0.15)] flex items-center justify-center rotate-12"
        >
          <Code2 className="w-8 h-8 text-accent/50" />
        </motion.div>
        
        <motion.div
          animate={{ y: [0, -10, 0], x: [0, 10, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
          className="absolute bottom-[25%] left-[8%] w-12 h-12 bg-blue-500/10 rounded-xl backdrop-blur-md border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)] flex items-center justify-center rotate-45"
        >
          <Terminal className="w-5 h-5 text-blue-500/50 -rotate-45" />
        </motion.div>

        <motion.div
          animate={{ y: [0, 15, 0], rotate: [0, -10, 10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-[30%] right-[10%] w-16 h-16 bg-emerald-500/10 rounded-2xl backdrop-blur-md border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)] flex items-center justify-center rotate-6"
        >
          <ShieldCheck className="w-6 h-6 text-emerald-500/50" />
        </motion.div>

        <motion.div
          animate={{ y: [0, -25, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute top-[45%] left-[5%] w-14 h-14 bg-amber-500/10 rounded-full backdrop-blur-md border border-amber-500/20 shadow-[0_0_25px_rgba(245,158,11,0.15)] flex items-center justify-center"
        >
          <Zap className="w-5 h-5 text-amber-500/50" />
        </motion.div>

        <motion.div
          animate={{ y: [0, 20, 0], x: [0, -15, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute top-[60%] right-[5%] w-10 h-10 bg-violet-500/10 rounded-lg backdrop-blur-sm border border-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.15)] flex items-center justify-center -rotate-12"
        >
          <div className="w-2 h-2 bg-violet-500/40 rounded-full" />
        </motion.div>

        <motion.div
          animate={{ y: [0, -15, 0], x: [0, 10, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
          className="absolute top-[8%] right-[30%] w-8 h-8 bg-orange-500/10 rounded-full backdrop-blur-sm border border-orange-500/20 flex items-center justify-center"
        >
          <div className="w-1.5 h-1.5 bg-orange-500/40 rounded-full" />
        </motion.div>

        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          className="absolute top-[65%] left-[25%] w-12 h-12 bg-pink-500/5 rounded-2xl backdrop-blur-sm border border-pink-500/20 flex items-center justify-center rotate-12"
        >
          <div className="w-4 h-4 rounded-full border border-pink-500/30" />
        </motion.div>
      </div>

      <div className="relative w-full max-w-lg z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl px-6 py-10 shadow-xl border border-slate-200/60 dark:border-white/10 sm:rounded-3xl sm:px-12 relative overflow-hidden group"
        >
          {/* Subtle top gradient border effect inside card */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 dark:via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/5 dark:bg-white/5 border border-primary/10 dark:border-white/10 flex items-center justify-center mb-6 relative">
              <Sparkle className="w-6 h-6 text-primary relative z-10" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome Back</h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">Sign in to continue to Cuelara.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-500 font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700 dark:text-emerald-500 font-medium">{success}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-700 dark:text-zinc-300">
                Email address
              </label>
              <div className="mt-2 relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 dark:text-zinc-500 group-focus-within/input:text-primary transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border-0 py-3.5 pl-10 pr-3 bg-white dark:bg-black/40 text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium leading-6 text-slate-700 dark:text-zinc-300">
                Password
              </label>
              <div className="mt-2 relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 dark:text-zinc-500 group-focus-within/input:text-primary transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border-0 py-3.5 pl-10 pr-3 bg-white dark:bg-black/40 text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center items-center gap-2 rounded-xl bg-primary px-3 py-3.5 text-sm font-bold text-white shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] dark:shadow-[0_4px_20px_-4px_rgba(79,70,229,0.5)] hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all disabled:opacity-70 disabled:cursor-not-allowed group/btn hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)]"
              >
                {loading ? "Signing in..." : "Sign in"}
                {!loading && <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 dark:border-white/5 pt-6">
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Don't have an account?{" "}
              <Link href="/register" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                Sign up free
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
