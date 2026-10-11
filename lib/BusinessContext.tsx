"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Role = "owner" | "staff" | null;

type BusinessContextValue = {
  business: any | null;
  role: Role;
  staffProfile: any | null;
  userId: string | null;
  // True once the initial auth+business lookup has resolved (either way) —
  // lets consumers tell "still checking" apart from "checked, no business."
  checked: boolean;
  // True when the lookup itself failed (network/DB error) rather than
  // legitimately finding no business — consumers must show a retryable error
  // instead of treating this the same as "not logged in" and redirecting.
  loadError: boolean;
  refresh: () => Promise<void>;
  // Merges a partial update into the cached business without a round trip —
  // e.g. after the dashboard saves changes, so the navbar picks up the new
  // name/logo immediately instead of waiting for the next full reload.
  patchBusiness: (patch: Record<string, any>) => void;
};

const BusinessContext = createContext<BusinessContextValue | null>(null);

// Fetches "what business (if any) does the current session belong to, and as
// what role" exactly once per session (on mount, and again on login/logout)
// instead of every page re-running its own lookup on every navigation. This
// lives in the root layout, above the router outlet, so it survives route
// changes. An owner is looked up first (the common case); if that comes back
// empty, the session might be a staff member instead — same real Supabase
// Auth session either way, just a different row it maps to.
export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [business, setBusiness] = useState<any | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [staffProfile, setStaffProfile] = useState<any | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user) {
      setBusiness(null);
      setRole(null);
      setStaffProfile(null);
      setLoadError(false);
      setChecked(true);
      return;
    }

    const { data: ownedBusiness, error: ownedError } = await supabase.from("businesses").select("*").eq("owner_id", user.id).maybeSingle();
    if (ownedError) {
      // A real failure here must NOT fall through to "check staff instead" —
      // that path would very likely fail too and this owner would end up
      // bounced to /account/login as if their listing had vanished.
      setLoadError(true);
      setChecked(true);
      return;
    }
    if (ownedBusiness) {
      setBusiness(ownedBusiness);
      setRole("owner");
      setStaffProfile(null);
      setLoadError(false);
      setChecked(true);
      return;
    }

    const { data: staffRow, error: staffError } = await supabase
      .from("staff")
      .select("*")
      .eq("auth_user_id", user.id)
      .eq("active", true)
      .maybeSingle();
    if (staffError) {
      setLoadError(true);
      setChecked(true);
      return;
    }
    if (staffRow) {
      setStaffProfile(staffRow);
      setRole("staff");
      // businesses_public is grant-select to any authenticated user for active
      // businesses — no owner-only fields, exactly the safe subset staff need
      // for display (name/logo/hours), same view the public directory uses.
      const { data: publicBiz, error: publicBizError } = await supabase
        .from("businesses_public")
        .select("*")
        .eq("id", staffRow.business_id)
        .maybeSingle();
      if (publicBizError) {
        setLoadError(true);
        setChecked(true);
        return;
      }
      // BUG FIX: businesses_public only holds APPROVED businesses, so staff of
      // a business still pending review (or suspended) came back with no
      // business at all and were locked out of the bookings board their owner
      // can use. Their bookings come from bookings_operational, which only
      // needs the id — fall back to that rather than nothing.
      setBusiness(publicBiz ?? { id: staffRow.business_id, name: "Your business", status: null });
      setLoadError(false);
      setChecked(true);
      return;
    }

    setBusiness(null);
    setRole(null);
    setStaffProfile(null);
    setLoadError(false);
    setChecked(true);
  }, []);

  useEffect(() => {
    load();
    // Deferred, not awaited: supabase-js awaits every auth listener while it
    // holds its internal lock, and load() itself calls getUser()/queries
    // that need that same lock — returning load()'s promise here could stall
    // sign-in (and token refreshes) until it settled, or deadlock outright.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      // Token refreshes don't change who's signed in — no need to refetch.
      if (event === "TOKEN_REFRESHED") return;
      setTimeout(() => { load(); }, 0);
    });
    return () => listener.subscription.unsubscribe();
  }, [load]);

  function patchBusiness(patch: Record<string, any>) {
    setBusiness((prev: any) => (prev ? { ...prev, ...patch } : prev));
  }

  return (
    <BusinessContext.Provider value={{ business, role, staffProfile, userId, checked, loadError, refresh: load, patchBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used within a BusinessProvider");
  return ctx;
}
