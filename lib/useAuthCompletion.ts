"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ensureCustomerAccount } from "@/lib/ensureCustomerAccount";
import { resolveAccountKind, destinationFor } from "@/lib/resolveLoginRedirect";
import { clearReturnTo, peekReturnTo, rememberReturnTo } from "@/lib/authReturn";

// Shared by /account/login and /account/signup: the ONE place that turns
// "this browser now has a session" into "take them back to what they were
// doing". Every way of arriving signed-in funnels through here — a password
// login, a Google redirect landing, an email-confirmation link, or simply
// opening the login page while already signed in.
//
// BUG FIX (the "stuck on the login page" report): the old hook only acted
// when `app_metadata.provider === "google"`. That field is the account's
// FIRST provider — an account created with email/password that later signed
// in with Google still reports "email", so a Google sign-in for it was
// silently ignored and the user sat on the login form with a live session
// (confirmed in the auth logs: Google callback succeeded, no redirect
// followed). This now reacts to any session, whatever the provider.
//
// Also: nothing that touches Supabase is awaited inside the
// onAuthStateChange callback. supabase-js awaits every listener while it
// holds its internal auth lock; a listener that itself calls getSession()/
// a query queues behind that same lock and can deadlock sign-in entirely.
// The work is handed off with setTimeout(0) instead (Supabase's own advice).
export function useAuthCompletion(next: string) {
  const [authError, setAuthError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const finishing = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Belt and braces for the OAuth round trip: if Supabase ever drops the
  // ?next= on the way back, the stored copy still knows where to go.
  useEffect(() => {
    if (next !== "/") rememberReturnTo(next);
  }, [next]);

  const finish = useCallback(
    async (user: User) => {
      if (finishing.current) return;
      finishing.current = true;
      setCompleting(true);
      setAuthError(null);

      const { kind } = await resolveAccountKind(user.id);
      if (kind === "customer") {
        const meta = (user.user_metadata || {}) as Record<string, unknown>;
        const { error } = await ensureCustomerAccount(user.id, {
          email: user.email,
          name: (meta.full_name as string) || (meta.name as string) || null,
          phone: (meta.phone as string) || null,
        });
        if (error) {
          finishing.current = false;
          setCompleting(false);
          setAuthError("We couldn't finish setting up your account — try signing in again.");
          return;
        }
      }

      const target = next !== "/" ? next : peekReturnTo() ?? "/";
      clearReturnTo();
      router.replace(destinationFor(kind, target));
    },
    [next, router]
  );

  useEffect(() => {
    // Google redirects back with ?error=... (not a session) when the user
    // cancels, or when the provider/redirect URL is misconfigured.
    const oauthDescription = searchParams.get("error_description") || searchParams.get("error");
    if (oauthDescription) {
      // Shown as plain text, but still trimmed: anyone can put arbitrary
      // words in this query string and send the link around.
      setAuthError(oauthDescription.replace(/\+/g, " ").replace(/[^\w\s.,'’:()\-]/g, "").slice(0, 160) || "Sign-in was cancelled.");
      router.replace(next !== "/" ? `${pathname}?next=${encodeURIComponent(next)}` : pathname);
    }
  }, [searchParams, next, router, pathname]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        const user = session.user;
        setTimeout(() => finish(user), 0);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [finish]);

  return { authError, setAuthError, completing, finish };
}
