"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type BusinessContextValue = {
  business: any | null;
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

// Fetches "the current owner's business" exactly once per session (on mount,
// and again on login/logout) instead of every page that needs it re-running
// its own auth.getUser() + businesses query on every navigation. This lives
// in the root layout, above the router outlet, so it survives route changes.
export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [business, setBusiness] = useState<any | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user) {
      setBusiness(null);
      setChecked(true);
      return;
    }
    const { data } = await supabase.from("businesses").select("*").eq("owner_id", user.id).single();
    setBusiness(data ?? null);
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
    <BusinessContext.Provider value={{ business, userId, checked, refresh: load, patchBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used within a BusinessProvider");
  return ctx;
}
