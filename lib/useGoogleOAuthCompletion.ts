"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ensureCustomerAccount } from "@/lib/ensureCustomerAccount";
import { resolveLoginRedirect } from "@/lib/resolveLoginRedirect";

// Shared by /account/login and /account/signup — GoogleAuthButton sends the
// user back to whichever of those two pages they started from, so both need
// to finish the same OAuth handshake: surface a cancelled/misconfigured
// error, or complete a successful sign-in by ensuring a `customers` row
// exists before moving on to `next`.
export function useGoogleOAuthCompletion(next: string, hadExplicitNext: boolean) {
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [completingOAuth, setCompletingOAuth] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Google redirects back here with ?error=... (not a session) when the
    // user cancels, or when the Google provider/redirect URL isn't
    // configured correctly on the Supabase project.
    const oauthDescription = searchParams.get("error_description") || searchParams.get("error");
    if (oauthDescription) {
      setOauthError(oauthDescription.replace(/\+/g, " "));
      router.replace(`${pathname}?next=${encodeURIComponent(next)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, next, router, pathname]);

  useEffect(() => {
    // Lands here after a Google redirect too — supabase-js picks the session
    // up from the URL on its own, this just finishes the app-side part.
    //
    // BUG FIX: this only ever listened for "SIGNED_IN", but supabase-js
    // typically parses the OAuth redirect's #access_token hash and settles
    // the session *before* this component's effect has run and subscribed a
    // listener — the client has no listeners yet at that instant, so the one
    // real "SIGNED_IN" event fires to nobody. A listener that subscribes
    // after that only ever receives "INITIAL_SESSION" (the current, already
    // signed-in state), which this code was ignoring — so ensureCustomerAccount
    // and the redirect never ran. Meanwhile Navbar's own listener reacts to
    // ANY auth event, so the header correctly showed the user as signed in
    // while this page stayed stuck showing the login form underneath it.
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event !== "SIGNED_IN" && event !== "INITIAL_SESSION") || !session?.user) return;
      const provider = session.user.app_metadata?.provider;
      if (provider !== "google") return;
      setCompletingOAuth(true);
      await ensureCustomerAccount(session.user.id, {
        email: session.user.email,
        name: (session.user.user_metadata?.full_name as string) || (session.user.user_metadata?.name as string) || null,
      });
      const dest = await resolveLoginRedirect(session.user.id, next, hadExplicitNext);
      router.push(dest);
    });
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, hadExplicitNext, router]);

  return { oauthError, setOauthError, completingOAuth };
}
