"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import PlateInput from "@/components/PlateInput";
import PhoneInput from "@/components/PhoneInput";
import {
  Car, Mail, ClipboardList, UsersRound, CheckCircle2, UserCheck, Wrench, Check, Ban, UserX,
} from "lucide-react";

const cardCls = "rounded-2xl bg-white border border-stone-line p-4 transition-shadow hover:shadow-sm";
const sectionTitle = "flex items-center gap-1.5 text-sm font-semibold text-ink mb-3";
const btnPrimary = "flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl bg-navy text-white shadow-sm hover:bg-navy-light hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-150";
const btnGhost = "flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl bg-canvas2 text-ink hover:bg-stone-line/60 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-150";
const btnDanger = "flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-150";

export default function BookingDrawerDetailsTab({
  booking,
  businessId,
  onUpdate,
}: {
  booking: any;
  businessId: string;
  onUpdate: (id: string, changes: Record<string, any>) => void | Promise<void>;
}) {
  const [bk, setBk] = useState(booking);
  const [saving, setSaving] = useState(false);
  const [activeStaff, setActiveStaff] = useState<{ id: string; name: string }[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadStaff() {
      const { data } = await supabase
        .from("staff")
        .select("id, name")
        .eq("business_id", businessId)
        .eq("active", true)
        .order("name");
      if (!cancelled) {
        setActiveStaff(data || []);
        setStaffLoading(false);
      }
    }
    loadStaff();
    return () => { cancelled = true; };
  }, [businessId]);

  function handleAssign(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value || null;
    setBk((prev: any) => ({ ...prev, assigned_staff_id: value }));
    onUpdate(bk.id, { assigned_staff_id: value });
  }

  function apply(changes: Record<string, any>) {
    setBk((prev: any) => ({ ...prev, ...changes }));
    onUpdate(bk.id, changes);
  }

  async function saveDetails() {
    setSaving(true);
    await onUpdate(bk.id, {
      vehicle_make: bk.vehicle_make,
      vehicle_model: bk.vehicle_model,
      vehicle_plate: bk.vehicle_plate,
      customer_email: bk.customer_email,
      customer_contact: bk.customer_contact,
    });
    setSaving(false);
  }

  return (
    <>
      {/* Read who it is, decide what to do about it, right next to each
          other — this used to live in the History tab, a click away from
          the customer info it depends on. History is now a pure timeline. */}
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

      {/* Contact + service snapshot */}
      <div className={cardCls}>
        <p className={sectionTitle}><ClipboardList size={14} /> Booking details</p>
        <div>
          <p className="text-xs text-stone mb-1">Contact</p>
          <PhoneInput value={bk.customer_contact || ""} onChange={(v) => setBk({ ...bk, customer_contact: v })} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm bg-canvas2 rounded-xl p-3.5 mt-3">
          <Info label="Service" value={bk.service || "—"} />
          <Info label="Date" value={bk.preferred_date ? new Date(bk.preferred_date).toLocaleDateString() : "—"} />
          <Info label="Time" value={bk.preferred_time || "—"} />
          <Info label="Source" value={bk.source === "manual" ? "Manual entry" : "Luupa"} />
        </div>
      </div>

      {/* Assigned staff */}
      <div className={cardCls}>
        <p className={sectionTitle}><UsersRound size={14} /> Assigned to</p>
        {staffLoading ? (
          <div className="h-11 bg-canvas2 rounded-lg animate-pulse" />
        ) : activeStaff.length === 0 ? (
          <p className="text-sm text-stone">
            No staff added yet — add your team from the{" "}
            <Link href="/business/staff" className="text-teal-dim font-medium hover:text-teal">Staff page</Link>.
          </p>
        ) : (
          <select value={bk.assigned_staff_id || ""} onChange={handleAssign} className="input">
            <option value="">Unassigned</option>
            {activeStaff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Vehicle */}
      <div className={cardCls}>
        <p className={sectionTitle}><Car size={14} /> Vehicle</p>
        <div className="grid grid-cols-2 gap-2.5">
          <input placeholder="Make" value={bk.vehicle_make || ""} onChange={(e) => setBk({ ...bk, vehicle_make: e.target.value })} className="input" />
          <input placeholder="Model" value={bk.vehicle_model || ""} onChange={(e) => setBk({ ...bk, vehicle_model: e.target.value })} className="input" />
        </div>
        <div className="mt-2.5">
          <PlateInput value={bk.vehicle_plate || ""} onChange={(formatted) => setBk({ ...bk, vehicle_plate: formatted })} />
        </div>
      </div>

      {/* Customer email, for the email invoice option */}
      <div className={cardCls}>
        <p className={sectionTitle}><Mail size={14} /> Customer email</p>
        <input
          type="email"
          placeholder="Optional — needed to send an email invoice"
          value={bk.customer_email || ""}
          onChange={(e) => setBk({ ...bk, customer_email: e.target.value })}
          className="input"
        />
      </div>

      <button onClick={saveDetails} disabled={saving} className="text-sm font-semibold text-teal-dim hover:text-teal disabled:opacity-60 transition-colors">
        {saving ? "Saving…" : "Save details"}
      </button>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-stone">{label}</p>
      <p className="text-ink font-medium">{value}</p>
    </div>
  );
}
