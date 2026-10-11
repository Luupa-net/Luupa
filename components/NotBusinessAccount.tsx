"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Building2, ArrowRight, LogOut, CalendarCheck } from "lucide-react";

// Shown on /business/* pages to a signed-in account that has no business
// (a customer, or a deactivated staff member) — instead of bouncing them
// between this page and the login page.
export default function NotBusinessAccount() {
  const router = useRouter();

  async function switchAccount() {
    await supabase.auth.signOut();
    router.replace(`/account/login?next=${encodeURIComponent(window.location.pathname)}`);
  }

  return (
    <div className="bg-canvas2 min-h-[calc(100vh-64px)] flex items-center justify-center px-5 py-16">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white border border-stone-line shadow-sm p-7 sm:p-9 text-center fade-up">
        <div aria-hidden className="absolute -top-16 -right-12 w-44 h-44 rounded-full bg-teal/10 blur-3xl pointer-events-none" />
        <span className="relative mx-auto w-14 h-14 rounded-2xl bg-navy/10 flex items-center justify-center">
          <Building2 size={24} className="text-navy" />
        </span>
        <h1 className="relative font-display text-2xl font-semibold text-ink mt-5">This area is for business accounts</h1>
        <p className="relative text-sm text-stone mt-2 leading-relaxed">
          You're signed in with an account that doesn't run a business on Luupa. List your business to get a booking calendar, checkout,
          receipts and reviews — or switch to the account that owns it.
        </p>
        <div className="relative mt-7 space-y-2.5">
          <Link
            href="/business/signup"
            className="flex items-center justify-center gap-2 w-full h-12 rounded-full bg-teal text-white font-semibold hover:bg-teal-dim active:scale-[0.98] transition-all"
          >
            List your business <ArrowRight size={16} />
          </Link>
          <Link
            href="/account/profile?tab=bookings"
            className="flex items-center justify-center gap-2 w-full h-12 rounded-full border border-stone-line text-ink font-semibold hover:bg-canvas2 transition-colors"
          >
            <CalendarCheck size={16} /> My bookings
          </Link>
          <button onClick={switchAccount} className="flex items-center justify-center gap-1.5 w-full text-sm text-stone hover:text-ink pt-2">
            <LogOut size={14} /> Sign out and switch account
          </button>
        </div>
      </div>
    </div>
  );
}
