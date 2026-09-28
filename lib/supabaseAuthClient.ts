import { createClient } from "@supabase/supabase-js";

// A throwaway anon-key client for verifying a staff PIN server-side
// (app/api/staff-login/route.ts). Deliberately NOT the shared `supabase`
// singleton from lib/supabase.ts: that's one module-level GoTrueClient
// instance, and signInWithPassword() mutates its internal session state —
// unlike auth.getUser(token), which is a stateless read other routes
// already share safely. Reusing the singleton here would make concurrent
// staff logins on the same warm server process contend over one shared
// client's session bookkeeping for tokens this route immediately hands off
// and discards. A fresh, non-persisting client per request avoids that.
export function createStaffAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
