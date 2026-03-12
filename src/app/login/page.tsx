"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Check your email to confirm your account!" });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--accent)]">Engineering V2MOM Dashboard</h1>
          <p className="text-slate-400 mt-2">Sign in to view your data</p>
        </div>

        <div className="bg-[var(--card)] rounded-xl p-8 shadow-xl border border-slate-700/50">
          <form className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            {message && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  message.type === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                }`}
              >
                {message.text}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="submit"
                onClick={handleSignIn}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-lg bg-[var(--accent)] text-slate-900 font-semibold hover:bg-[var(--accent-muted)] transition-colors disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <button
                type="button"
                onClick={handleSignUp}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-lg bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                Sign Up
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          <Link href="/" className="text-[var(--accent)] hover:underline">
            ← Back to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
