"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { normalizeWhatsAppNumber } from "@/lib/validation";
import PhoneInput from "@/components/PhoneInput";
import { Delete, KeyRound, AlertCircle, Loader2 } from "lucide-react";

const PIN_LENGTH = 6; // upper bound — a shorter PIN still submits fine, this just caps the dots/keys

export default function StaffLoginPage() {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  // A real (visually hidden) input sits over the dots so a staff member on a
  // laptop can just type their PIN with a keyboard, not only click the pad —
  // the on-screen keypad stays for a shared touch front-desk device.
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    hiddenInputRef.current?.focus();
  }, []);

  function setDigits(next: string) {
    setError(null);
    setPin(next.replace(/\D/g, "").slice(0, PIN_LENGTH));
  }

  function pressDigit(d: string) {
    if (loading) return;
    setDigits(pin.length < PIN_LENGTH ? pin + d : pin);
    hiddenInputRef.current?.focus();
  }

  function backspace() {
    if (loading) return;
    setDigits(pin.slice(0, -1));
    hiddenInputRef.current?.focus();
  }

  async function handleSubmit() {
    if (!phone || pin.length < 4) {
      setError("Enter your phone number and PIN.");
      return;
    }
    setLoading(true);
    setError(null);
    // Goes through a server route (not supabase.auth.signInWithPassword
    // directly) so failed attempts can be tracked and locked out per staff
    // account — see app/api/staff-login/route.ts for why and the error-code
    // handling this used to do client-side.
    const res = await fetch("/api/staff-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalizeWhatsAppNumber(phone), pin }),
    });
    const result = await res.json();
    if (!res.ok || !result.ok) {
      setError(result.error || "Something went wrong — try again.");
      setPin("");
      setLoading(false);
      hiddenInputRef.current?.focus();
      return;
    }
    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    });
    if (setSessionError) {
      setError("Signed in, but couldn't start your session — try again.");
      setLoading(false);
      return;
    }
    router.push("/business/bookings");
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-canvas2 flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-line shadow-sm p-6 sm:p-8 fade-up">
        <div className="w-12 h-12 rounded-full bg-navy/10 flex items-center justify-center mx-auto mb-3">
          <KeyRound size={20} className="text-navy" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink text-center">Staff sign-in</h1>
        <p className="text-sm text-stone text-center mt-1.5">Enter your phone number and PIN.</p>

        <div className="mt-6">
          <PhoneInput value={phone} onChange={setPhone} />
        </div>

        {/* PIN dots — filled as digits are entered, not the digits themselves.
            Always renders all 6 slots (the max PIN length) so a 4-digit PIN
            doesn't look "finished" two digits early. The real input is this
            transparent, keyboard-focusable field layered on top: clicking
            anywhere in the row, or just typing, both work. */}
        <div className="relative mt-6 mb-2 h-8">
          <input
            ref={hiddenInputRef}
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => setDigits(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            disabled={loading}
            aria-label="PIN"
            className="absolute inset-0 w-full h-full opacity-0 cursor-text"
          />
          <div className="pointer-events-none flex items-center justify-center gap-2.5 h-full">
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <span
                key={i}
                className={`w-3 h-3 rounded-full border-2 transition-colors ${
                  i < pin.length ? "bg-navy border-navy" : "border-stone-line"
                }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-red-50 px-4 py-3.5">
            <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Touch-friendly numeric pad for a shared front-desk device — the
            hidden input above covers keyboard entry, this covers touch. */}
        <div className="grid grid-cols-3 gap-2.5 mt-5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => pressDigit(d)}
              className="h-14 rounded-xl bg-canvas2 text-ink text-xl font-semibold hover:bg-stone-line/60 active:scale-95 transition-all"
            >
              {d}
            </button>
          ))}
          <span />
          <button
            type="button"
            onClick={() => pressDigit("0")}
            className="h-14 rounded-xl bg-canvas2 text-ink text-xl font-semibold hover:bg-stone-line/60 active:scale-95 transition-all"
          >
            0
          </button>
          <button
            type="button"
            onClick={backspace}
            aria-label="Backspace"
            className="h-14 rounded-xl flex items-center justify-center text-stone hover:text-ink hover:bg-canvas2 active:scale-95 transition-all"
          >
            <Delete size={20} />
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !phone || pin.length < 4}
          className="w-full h-12 rounded-full bg-teal text-white font-semibold hover:bg-teal-dim active:scale-95 transition-all disabled:opacity-40 mt-6 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </div>
  );
}
