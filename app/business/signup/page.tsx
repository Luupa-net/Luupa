"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Eye, MessageCircleMore, ShieldCheck } from "lucide-react";

export default function BusinessSignup() {
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

    if (data.user) {
      await supabase.from("businesses").insert({
        owner_id: data.user.id,
        name: businessName,
        status: "pending", // reviewed by admin before going live
        tier: "free",
      });
    }

    router.push("/business/dashboard");
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-14">
      {/* Pitch — belongs here, in business context, not on the customer-facing homepage */}
      <div>
        <span className="inline-block text-xs uppercase tracking-wide font-medium text-terra-dim bg-terra/10 px-3 py-1.5 rounded-full mb-4">
          Founding partner offer — first 10 businesses
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink leading-tight">
          Bahrain searches for car care every day. Most of it never reaches you.
        </h1>
        <p className="text-stone mt-3">
          3 months free for the first 10 businesses. After that, simple monthly pricing — no surprises, cancel anytime.
        </p>

        <div className="space-y-6 mt-10">
          <Reason
            icon={<Eye size={18} className="text-navy" />}
            title="Show up when it counts"
            text="Someone searching 'ceramic coating Riffa' finds a real answer — your shop, not a scroll of unrelated posts."
          />
          <Reason
            icon={<MessageCircleMore size={18} className="text-navy" />}
            title="They message you directly"
            text="No booking fees, no middleman taking a cut. A customer taps through and reaches you on WhatsApp, same as always."
          />
          <Reason
            icon={<ShieldCheck size={18} className="text-navy" />}
            title="Trust, built in"
            text="A verified badge and a real profile do the convincing before the first message is even sent."
          />
        </div>
      </div>

      {/* Form */}
      <div className="bg-canvas2 rounded-2xl p-8">
        <h2 className="font-display text-2xl font-semibold text-ink">Create your account</h2>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Business name">
            <input
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Email">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Password">
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            disabled={loading}
            className="w-full h-12 rounded-lg bg-terra text-white font-semibold hover:bg-terra-dim active:scale-95 transition-colors disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-sm text-stone mt-6">
          Already listed? <a href="/business/login" className="text-terra-dim font-medium">Log in</a>
        </p>
      </div>
    </div>
  );
}

function Reason({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3.5">
      <div className="w-9 h-9 rounded-lg bg-navy/10 flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
        <p className="text-stone mt-0.5 text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
