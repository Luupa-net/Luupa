"use client";

import { Loader2 } from "lucide-react";

// Shown the moment a session exists — covers the resolve + navigation gap so
// the user never sees the login form sitting there after a successful login.
export default function SigningIn({ returning }: { returning: boolean }) {
  return (
    <div className="max-w-md mx-auto px-6 py-28 flex flex-col items-center text-center fade-up">
      <span className="relative w-14 h-14 rounded-full bg-teal/10 flex items-center justify-center">
        <span className="absolute inset-0 rounded-full border-2 border-teal/25 animate-ping" />
        <Loader2 size={22} className="animate-spin text-teal-dim" />
      </span>
      <p className="font-display text-xl font-semibold text-ink mt-5">You're signed in</p>
      <p className="text-sm text-stone mt-1">{returning ? "Taking you back to where you left off…" : "Getting things ready…"}</p>
    </div>
  );
}
