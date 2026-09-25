"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, AlertCircle, Sparkles, Sparkle, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { requestPasswordReset } from "@/app/actions/auth";
import { useTurnstile } from "@/components/security/Turnstile";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const ts = useTurnstile();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set("turnstileToken", ts.token);
      const res = await requestPasswordReset(formData);
      if (res.error) setError(res.error);
      else if (res.success) setSuccess(res.success);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
      ts.reset(); // a token is single-use
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center pt-32 pb-12 px-6 lg:px-8 bg-grid-pattern bg-background overflow-hidden">
      <div className="absolute top-[-10%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-primary/10 blur-[120px] dark:blur-[150px] mix-blend-multiply dark:mix-blend-screen pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[30vw] h-[30vw] rounded-full bg-accent/10 blur-[100px] dark:blur-[120px] mix-blend-multiply dark:mix-blend-screen pointer-events-none" />

      <div className="relative w-full max-w-lg z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl px-6 py-10 shadow-xl border border-slate-200/60 dark:border-white/10 sm:rounded-3xl sm:px-12 relative overflow-hidden group"
        >
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 dark:via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/5 dark:bg-white/5 border border-primary/10 dark:border-white/10 flex items-center justify-center mb-6 relative">
              <Sparkle className="w-6 h-6 text-primary relative z-10" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Reset your password</h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2 text-center">Enter your account email and we&rsquo;ll send you a reset link.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-500 font-medium">{error}</p>
            </div>
          )}

          {success ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700 dark:text-emerald-500 font-medium">{success}</p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium leading-6 text-slate-700 dark:text-zinc-300">Email address</label>
                <div className="mt-2 relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400 dark:text-zinc-500 group-focus-within/input:text-primary transition-colors" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border-0 py-3.5 pl-10 pr-3 bg-white dark:bg-black/40 text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {ts.widget}

              <button
                type="submit"
                disabled={loading || ts.blocked}
                className="flex w-full justify-center items-center gap-2 rounded-xl bg-primary px-3 py-3.5 text-sm font-bold text-white shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] dark:shadow-[0_4px_20px_-4px_rgba(79,70,229,0.5)] hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all disabled:opacity-70 disabled:cursor-not-allowed group/btn hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)]"
              >
                {loading ? "Sending..." : "Send reset link"}
                {!loading && <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />}
              </button>
            </form>
          )}

          <div className="mt-8 text-center border-t border-slate-100 dark:border-white/5 pt-6">
            <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
