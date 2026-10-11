"use client";

import { supabase } from "@/lib/supabase";

export type StaffDirectoryRow = { id: string; name: string; role: string | null; active: boolean; auth_user_id: string | null };

// The team list for a business, through the narrow staff_directory view
// (migration-v30) so a staff session never reads coworkers' CPR/phone.
// Falls back to the base table if the view isn't there yet (an owner can
// read their own roster either way).
export async function loadStaffDirectory(businessId: string, { activeOnly = false } = {}): Promise<StaffDirectoryRow[]> {
  const query = (source: "staff_directory" | "staff") => {
    let q = supabase.from(source).select("id, name, role, active, auth_user_id").eq("business_id", businessId);
    if (activeOnly) q = q.eq("active", true);
    return q.order("name");
  };
  const { data, error } = await query("staff_directory");
  if (!error) return (data ?? []) as StaffDirectoryRow[];
  const fallback = await query("staff");
  return (fallback.data ?? []) as StaffDirectoryRow[];
}
