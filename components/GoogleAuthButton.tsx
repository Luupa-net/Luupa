"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function GoogleAuthButton({
  next,
  label = "Continue with Google",
  onError,
}: {
  next: string;
  label?: string;
  onError?: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    onError?.("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Whichever page this button is on (login or signup) is where Google
        // sends the user back — previously hardcoded to /account/login, so a
        // cancelled/failed sign-up always dropped the user on the Login page
        // instead of back on Signup.
        redirectTo: `${window.location.origin}${window.location.pathname}?next=${encodeURIComponent(next)}`,
      },
    });
    // A full-page redirect follows on success, so this only ever resolves
    // here when something stopped it before that — e.g. the Google provider
    // isn't enabled in Supabase, or the site URL isn't in its allow list.
    if (error) {
      setLoading(false);
      onError?.(error.message || "Couldn't start Google sign-in. Please try again.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="group relative w-full h-12 rounded-full border border-stone-line bg-white text-ink font-semibold overflow-hidden
                 transition-all duration-200 flex items-center justify-center gap-2.5
                 hover:border-navy/25 hover:shadow-[0_4px_16px_-4px_rgba(15,61,46,0.18)]
                 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <span className="absolute inset-0 bg-canvas2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      <span className="relative flex items-center justify-center gap-2.5">
        {loading ? (
          <Loader2 size={18} className="animate-spin text-stone" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
          </svg>
        )}
        {loading ? "Connecting…" : label}
      </span>
    </button>
  );
}
