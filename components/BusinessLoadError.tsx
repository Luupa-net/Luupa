"use client";

import { AlertCircle, RotateCw } from "lucide-react";

// Shown by every business/staff page (dashboard, staff, bookings, customers)
// when BusinessContext's lookup itself fails — a transient DB/network error,
// not "you have no business." Never auto-redirects: unlike the "no business"
// case, this is retryable, and treating it as a login-redirect was the bug
// this component exists to fix (see lib/BusinessContext.tsx's loadError).
export default function BusinessLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-canvas2 min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={20} className="text-red-600" />
        </div>
        <p className="text-sm font-medium text-ink">Couldn't load your account</p>
        <p className="text-sm text-stone mt-1">Something went wrong reaching the server — try again.</p>
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl bg-navy text-white hover:bg-navy-light active:scale-95 transition-all"
        >
          <RotateCw size={14} /> Try again
        </button>
      </div>
    </div>
  );
}
