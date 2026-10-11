"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Counts a listing view from the browser, once per visitor per listing per
// browser session. It used to be an un-awaited RPC inside the server render
// — which could be dropped once the render finished (serverless) — and it
// counted every refresh, link-preview bot and prefetch as a "view".
export default function ViewTracker({ businessId }: { businessId: string }) {
  useEffect(() => {
    const key = `luupa:viewed:${businessId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // storage unavailable — still count it
    }
    supabase.rpc("increment_view_count", { business_id: businessId }).then(() => {});
  }, [businessId]);
  return null;
}
