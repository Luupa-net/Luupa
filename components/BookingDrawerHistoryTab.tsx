"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { History } from "lucide-react";

const cardCls = "rounded-2xl bg-white border border-stone-line p-4 transition-shadow hover:shadow-sm";
const sectionTitle = "flex items-center gap-1.5 text-sm font-semibold text-ink mb-3";

const STATUS_LABEL: Record<string, string> = {
  pending: "Requested",
  confirmed: "Confirmed",
  declined: "Declined",
  arrived: "Customer arrived",
  in_progress: "Car in service",
  completed: "Completed",
  no_show: "Marked no-show",
  cancelled: "Cancelled",
};

type HistoryRow = {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_at: string;
};

export default function BookingDrawerHistoryTab({ booking }: { booking: any }) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // The timeline itself (booking_status_history) is populated automatically
  // by a DB trigger on every status change — this just reads it back and
  // resolves each `changed_by` uuid to a name a person recognizes. Owners can
  // already see their full staff roster; staff can see it too as of
  // migration-v23.sql, so either viewer can resolve a teammate's name.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [{ data: { user } }, { data: historyRows }, { data: staffRows }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("booking_status_history").select("*").eq("booking_id", booking.id).order("changed_at"),
        supabase.from("staff").select("auth_user_id, name").eq("business_id", booking.business_id),
      ]);
      if (cancelled) return;
      const map: Record<string, string> = {};
      (staffRows || []).forEach((s: any) => { if (s.auth_user_id) map[s.auth_user_id] = s.name; });
      if (user) map[user.id] = "You";
      setNames(map);
      setRows((historyRows || []) as HistoryRow[]);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [booking.id, booking.business_id]);

  function whoChanged(row: HistoryRow): string {
    if (!row.changed_by) return "System";
    return names[row.changed_by] || "Owner";
  }

  return (
    <>
      <div className={cardCls}>
        <p className={sectionTitle}><History size={14} /> Timeline</p>
        {loading ? (
          <div className="space-y-2">
            <div className="h-9 bg-canvas2 rounded-lg animate-pulse" />
            <div className="h-9 bg-canvas2 rounded-lg animate-pulse" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-stone">No status changes recorded yet.</p>
        ) : (
          <ol className="relative border-l border-stone-line ml-1.5 space-y-4">
            {rows.map((row) => (
              <li key={row.id} className="pl-4">
                <span className="absolute -translate-x-[5px] w-2.5 h-2.5 rounded-full bg-teal border-2 border-white shadow-sm" />
                <p className="text-sm text-ink">
                  <span className="font-medium">{STATUS_LABEL[row.new_status] || row.new_status}</span>
                  {" · "}
                  <span className="text-stone">{whoChanged(row)}</span>
                </p>
                <p className="text-xs text-stone mt-0.5">
                  {new Date(row.changed_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
