"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Supabase reads the recovery token out of the URL automatically and
    // fires this event once a recovery session is ready to use.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Also cover the case where the session is already established by the
    // time this component mounts (e.g. a fast redirect).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password should be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/"), 1800);
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold text-ink">Password updated</h1>
        <p className="text-stone mt-2 text-sm">Taking you home…</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <p className="text-stone text-sm">Verifying your reset link…</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-ink">Set a new password</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-ink">New password</span>
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Confirm new password</span>
          <input required type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input mt-1" />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={saving}
          className="w-full h-12 rounded-full bg-teal text-white font-semibold hover:bg-teal-dim active:scale-95 transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Set new password"}
        </button>
      </form>
    </div>
  );
}
