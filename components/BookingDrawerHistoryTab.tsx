"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  CheckCircle2, UserCheck, Wrench, Check, Ban, UserX, History,
} from "lucide-react";

const cardCls = "rounded-2xl bg-white border border-stone-line p-4 transition-shadow hover:shadow-sm";
const sectionTitle = "flex items-center gap-1.5 text-sm font-semibold text-ink mb-3";
const btnPrimary = "flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl bg-navy text-white shadow-sm hover:bg-navy-light hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-150";
const btnGhost = "flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl bg-canvas2 text-ink hover:bg-stone-line/60 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-150";
const btnDanger = "flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-150";

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

export default function BookingDrawerHistoryTab({
  booking,
  onUpdate,
}: {
  booking: any;
  onUpdate: (id: string, changes: Record<string, any>) => void | Promise<void>;
}) {
  const [bk, setBk] = useState(booking);
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

  function apply(changes: Record<string, any>) {
    setBk((prev: any) => ({ ...prev, ...changes }));
    onUpdate(bk.id, changes);
  }

  function whoChanged(row: HistoryRow): string {
    if (!row.changed_by) return "System";
    return names[row.changed_by] || "Owner";
  }

  return (
    <>
      <div className={cardCls}>
        <p className={sectionTitle}><CheckCircle2 size={14} /> Update status</p>
        <div className="flex flex-wrap gap-2">
          {bk.status === "pending" && (
            <>
              <button onClick={() => apply({ status: "confirmed" })} className={btnPrimary}><Check size={14} /> Confirm</button>
              <button onClick={() => apply({ status: "declined" })} className={btnDanger}><Ban size={14} /> Decline</button>
            </>
          )}
          {bk.status === "confirmed" && (
            <>
              <button onClick={() => apply({ status: "arrived" })} className={btnPrimary}><UserCheck size={14} /> Customer arrived</button>
              <button onClick={() => apply({ status: "no_show" })} className={btnGhost}><UserX size={14} /> No-show</button>
              <button onClick={() => apply({ status: "cancelled" })} className={btnDanger}><Ban size={14} /> Cancel</button>
            </>
          )}
          {bk.status === "arrived" && (
            <button onClick={() => apply({ status: "in_progress" })} className={btnPrimary}><Wrench size={14} /> Car left with us</button>
          )}
          {bk.status === "in_progress" && (
            <button onClick={() => apply({ status: "completed" })} className={btnPrimary}><CheckCircle2 size={14} /> Mark completed</button>
          )}
          {["declined", "no_show", "cancelled", "completed"].includes(bk.status) && (
            <span className="text-xs text-stone self-center">Nothing further to do here.</span>
          )}
        </div>
      </div>

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
