"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { normalizeWhatsAppNumber } from "@/lib/validation";
import PhoneInput from "@/components/PhoneInput";
import { Delete, KeyRound, AlertCircle, Lock, Loader2 } from "lucide-react";

const PIN_LENGTH = 6; // upper bound — a shorter PIN still submits fine, this just caps the dots/keys

type ErrorReason = "invalid_credentials" | "locked" | "system_error" | null;

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function StaffLoginPage() {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<ErrorReason>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  // A real (visually hidden) input sits over the dots so a staff member on a
  // laptop can just type their PIN with a keyboard, not only click the pad —
  // the on-screen keypad stays for a shared touch front-desk device.
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    hiddenInputRef.current?.focus();
  }, []);

  // Ticks the lockout countdown down once a second so the message stays
  // accurate on its own — the API only ever returns the count at the moment
  // of that one request, and the retry button re-enabling itself the instant
  // it hits zero (rather than the staff member having to guess and retry) is
  // the whole point of returning retryAfterSeconds in the first place.
  useEffect(() => {
    if (retryAfter === null || retryAfter <= 0) return;
    const id = setInterval(() => {
      setRetryAfter((s) => (s !== null && s > 1 ? s - 1 : null));
    }, 1000);
    return () => clearInterval(id);
  }, [retryAfter]);

  const locked = errorReason === "locked" && !!retryAfter && retryAfter > 0;

  function setDigits(next: string) {
    setError(null);
    setErrorReason(null);
    setPin(next.replace(/\D/g, "").slice(0, PIN_LENGTH));
  }

  function pressDigit(d: string) {
    if (loading || locked) return;
    setDigits(pin.length < PIN_LENGTH ? pin + d : pin);
    hiddenInputRef.current?.focus();
  }

  function backspace() {
    if (loading || locked) return;
    setDigits(pin.slice(0, -1));
    hiddenInputRef.current?.focus();
  }

  async function handleSubmit() {
    if (locked) return;
    if (!phone || pin.length < 4) {
      setError("Enter your phone number and PIN.");
      setErrorReason(null);
      return;
    }
    setLoading(true);
    setError(null);
    setErrorReason(null);
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
      setErrorReason(result.reason ?? null);
      setRetryAfter(result.reason === "locked" && result.retryAfterSeconds ? result.retryAfterSeconds : null);
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
    <div className="relative min-h-[calc(100vh-64px)] bg-canvas2 flex items-center justify-center px-5 py-10 overflow-hidden">
      {/* Ambient background flare — the same drift/blur language used for the
          gradient hero headers elsewhere in the app (dashboard, staff list),
          scaled down to sit behind a centered card instead of inside a bar. */}
      <div aria-hidden className="absolute -top-24 -left-16 w-72 h-72 rounded-full bg-navy/[0.07] blur-3xl drift-slow pointer-events-none" />
      <div aria-hidden className="absolute -bottom-28 -right-20 w-80 h-80 rounded-full bg-teal/[0.08] blur-3xl drift-slow-reverse pointer-events-none" />

      <div className="relative w-full max-w-sm bg-white rounded-2xl border border-stone-line shadow-lg shadow-black/[0.04] p-6 sm:p-8 fade-up">
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
            disabled={loading || locked}
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

        {/* Locked-out is visually distinct from a wrong-PIN guess — neutral
            gray + a lock icon + a live countdown, not another red error, so
            it reads as "wait" rather than "you did something wrong". */}
        {error && (
          <div className={`mt-4 flex items-start gap-2.5 rounded-lg px-4 py-3.5 ${locked ? "bg-stone-line/50" : "bg-red-50"}`}>
            {locked ? (
              <Lock size={16} className="text-ink/60 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`text-sm ${locked ? "text-ink/80" : "text-red-700"}`}>{error}</p>
              {locked && retryAfter !== null && (
                <p className="text-xs text-stone mt-1 font-mono tabular-nums">{formatCountdown(retryAfter)} remaining</p>
              )}
            </div>
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
              disabled={locked}
              className="h-14 rounded-xl bg-canvas2 text-ink text-xl font-semibold hover:bg-stone-line/60 active:scale-90 active:shadow-inner transition-all disabled:opacity-40"
            >
              {d}
            </button>
          ))}
          <span />
          <button
            type="button"
            onClick={() => pressDigit("0")}
            disabled={locked}
            className="h-14 rounded-xl bg-canvas2 text-ink text-xl font-semibold hover:bg-stone-line/60 active:scale-90 active:shadow-inner transition-all disabled:opacity-40"
          >
            0
          </button>
          <button
            type="button"
            onClick={backspace}
            disabled={locked}
            aria-label="Backspace"
            className="h-14 rounded-xl flex items-center justify-center text-stone hover:text-ink hover:bg-canvas2 active:scale-90 transition-all disabled:opacity-40"
          >
            <Delete size={20} />
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || locked || !phone || pin.length < 4}
          className="w-full h-12 rounded-full bg-teal text-white font-semibold hover:bg-teal-dim hover:shadow-lg hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none mt-6 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Signing in…" : locked ? "Locked" : "Sign in"}
        </button>
      </div>
    </div>
  );
}
