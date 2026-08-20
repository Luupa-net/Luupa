"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import BackHome from "@/components/BackHome";

export default function BusinessLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    router.push("/business/dashboard");
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <BackHome />
      <h1 className="font-display text-3xl font-semibold text-ink">Business login</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-ink">Email</span>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Password</span>
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input mt-1" />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          disabled={loading}
          className="w-full h-12 rounded-full bg-terra text-white font-semibold hover:bg-terra-dim active:scale-95 transition-colors disabled:opacity-60"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="text-sm text-stone mt-6">
        New here? <a href="/business/signup" className="text-terra-dim font-medium">List your business</a>
      </p>
    </div>
  );
}
