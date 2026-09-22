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

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user) {
      setBusiness(null);
      setRole(null);
      setStaffProfile(null);
      setChecked(true);
      return;
    }

    const { data: ownedBusiness } = await supabase.from("businesses").select("*").eq("owner_id", user.id).maybeSingle();
    if (ownedBusiness) {
      setBusiness(ownedBusiness);
      setRole("owner");
      setStaffProfile(null);
      setChecked(true);
      return;
    }

    const { data: staffRow } = await supabase
      .from("staff")
      .select("*")
      .eq("auth_user_id", user.id)
      .eq("active", true)
      .maybeSingle();
    if (staffRow) {
      setStaffProfile(staffRow);
      setRole("staff");
      // businesses_public is grant-select to any authenticated user for active
      // businesses — no owner-only fields, exactly the safe subset staff need
      // for display (name/logo/hours), same view the public directory uses.
      const { data: publicBiz } = await supabase
        .from("businesses_public")
        .select("*")
        .eq("id", staffRow.business_id)
        .maybeSingle();
      setBusiness(publicBiz ?? null);
      setChecked(true);
      return;
    }

    setBusiness(null);
    setRole(null);
    setStaffProfile(null);
    setChecked(true);
  }, []);

  useEffect(() => {
    load();
    const { data: listener } = supabase.auth.onAuthStateChange(() => load());
    return () => listener.subscription.unsubscribe();
  }, [load]);

  function patchBusiness(patch: Record<string, any>) {
    setBusiness((prev: any) => (prev ? { ...prev, ...patch } : prev));
  }

  return (
    <BusinessContext.Provider value={{ business, role, staffProfile, userId, checked, refresh: load, patchBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used within a BusinessProvider");
  return ctx;
}
