"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { safeNextPath } from "@/lib/validation";
import PhoneInput from "@/components/PhoneInput";
import GoogleAuthButton from "@/components/GoogleAuthButton";

function AccountSignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    if (!data.user) {
      setError("Something went wrong creating your account — try again.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("customers").insert({
      id: data.user.id,
      name,
      email,
      phone,
    });
    setLoading(false);
    if (insertError) {
      setError("Account created, but we couldn't save your details: " + insertError.message);
      return;
    }
    router.push(next);
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-ink">Create your account</h1>
      <p className="text-stone mt-2 text-sm">
        One account to book with any business on Luupa — no retyping your details every time.
      </p>

      <div className="mt-8">
        <GoogleAuthButton next={next} label="Sign up with Google" />
      </div>
      <div className="flex items-center gap-3 my-6">
        <div className="h-px bg-stone-line flex-1" />
        <span className="text-xs text-stone">or</span>
        <div className="h-px bg-stone-line flex-1" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-ink">Full name</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Email</span>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink mb-1 block">Phone / WhatsApp</span>
          <PhoneInput value={phone} onChange={setPhone} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Password</span>
          <input
            required
            minLength={8}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input mt-1"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          disabled={loading}
          className="w-full h-12 rounded-full bg-teal text-white font-semibold hover:bg-teal-dim active:scale-95 transition-colors disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-sm text-stone mt-6">
        Already have an account?{" "}
        <Link href={`/account/login?next=${encodeURIComponent(next)}`} className="text-teal-dim font-medium">
          Log in
        </Link>
      </p>
    </div>
  );
}

export default function AccountSignup() {
  return (
    <Suspense>
      <AccountSignupForm />
    </Suspense>
  );
}
