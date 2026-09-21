"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ensureCustomerAccount } from "@/lib/ensureCustomerAccount";

// Shared by /account/login and /account/signup — GoogleAuthButton sends the
// user back to whichever of those two pages they started from, so both need
// to finish the same OAuth handshake: surface a cancelled/misconfigured
// error, or complete a successful sign-in by ensuring a `customers` row
// exists before moving on to `next`.
export function useGoogleOAuthCompletion(next: string) {
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
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== "SIGNED_IN" || !session?.user) return;
      const provider = session.user.app_metadata?.provider;
      if (provider !== "google") return;
      setCompletingOAuth(true);
      await ensureCustomerAccount(session.user.id, {
        email: session.user.email,
        name: (session.user.user_metadata?.full_name as string) || (session.user.user_metadata?.name as string) || null,
      });
      router.push(next);
    });
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, router]);

  return { oauthError, setOauthError, completingOAuth };
}
