"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const error = searchParams?.get("error");

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
        router.replace(`/admin/login?error=${encodeURIComponent(res.error)}`);
      } else if (res?.ok) {
        router.push("/admin/dashboard");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-sm">
            <ShieldAlert className="w-6 h-6 text-red-500" />
          </div>
        </div>
        
        <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-white">
          Admin Portal Access
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Restricted area. Authorized personnel only.
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[400px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900 px-6 py-10 shadow-2xl border border-zinc-800 sm:rounded-3xl sm:px-12"
        >
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-500 font-medium">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium leading-6 text-zinc-200">
                Admin Email
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border-0 py-3 pl-10 pr-3 bg-zinc-950 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6 transition-all"
                  placeholder="admin@cuelara.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium leading-6 text-zinc-200">
                Master Password
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border-0 py-3 pl-10 pr-3 bg-zinc-950 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center items-center gap-2 rounded-xl bg-red-600 px-3 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? "Authenticating..." : "Enter Portal"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>
          
          <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
            <Link href="/login" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              &larr; Return to public login
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
