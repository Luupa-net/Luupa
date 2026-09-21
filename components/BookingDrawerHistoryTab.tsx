"use client";

import { useState } from "react";
import {
  CheckCircle2, UserCheck, Wrench, Check, Ban, UserX,
} from "lucide-react";

const cardCls = "rounded-2xl bg-white border border-stone-line p-4 transition-shadow hover:shadow-sm";
const sectionTitle = "flex items-center gap-1.5 text-sm font-semibold text-ink mb-3";
const btnPrimary = "flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl bg-navy text-white shadow-sm hover:bg-navy-light hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-150";
const btnGhost = "flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl bg-canvas2 text-ink hover:bg-stone-line/60 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-150";
const btnDanger = "flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-150";

// Status-history timeline (from booking_status_history) is a later step —
// for now this tab is just the status-action card ported as-is.
export default function BookingDrawerHistoryTab({
  booking,
  onUpdate,
}: {
  booking: any;
  onUpdate: (id: string, changes: Record<string, any>) => void | Promise<void>;
}) {
  const [bk, setBk] = useState(booking);

  function apply(changes: Record<string, any>) {
    setBk((prev: any) => ({ ...prev, ...changes }));
    onUpdate(bk.id, changes);
  }

  return (
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
  );
}
