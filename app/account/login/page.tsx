"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { safeNextPath } from "@/lib/validation";
import { Check } from "lucide-react";

function AccountLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));

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
    router.push(next);
  }

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/account/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setResetSent(true);
  }

  if (forgotMode) {
    return (
      <div className="max-w-md mx-auto px-6 py-16">
        <h1 className="font-display text-3xl font-semibold text-ink">Reset your password</h1>
        <p className="text-stone mt-2 text-sm">Enter your account email and we'll send you a link to set a new password.</p>

        {resetSent ? (
          <div className="mt-8 flex items-start gap-2.5 rounded-lg bg-teal/5 px-4 py-3.5">
            <Check size={18} className="text-teal shrink-0 mt-0.5" />
            <p className="text-sm text-ink">
              If an account exists for <b>{email}</b>, a reset link is on its way — check your inbox.
            </p>
          </div>
        ) : (
          <form onSubmit={handleResetRequest} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-ink">Email</span>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input mt-1" />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              disabled={loading}
              className="w-full h-12 rounded-full bg-teal text-white font-semibold hover:bg-teal-dim active:scale-95 transition-colors disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <button onClick={() => { setForgotMode(false); setResetSent(false); setError(null); }} className="text-sm text-stone mt-6">
          ← Back to login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-ink">Log in</h1>

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
          className="w-full h-12 rounded-full bg-teal text-white font-semibold hover:bg-teal-dim active:scale-95 transition-colors disabled:opacity-60"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <button onClick={() => setForgotMode(true)} className="text-sm text-navy font-medium mt-4">
        Forgot your password?
      </button>

      <p className="text-sm text-stone mt-6">
        New here?{" "}
        <Link href={`/account/signup?next=${encodeURIComponent(next)}`} className="text-teal-dim font-medium">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function AccountLogin() {
  return (
    <Suspense>
      <AccountLoginForm />
    </Suspense>
  );
}
