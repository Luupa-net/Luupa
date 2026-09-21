"use client";

import { useState } from "react";
import PlateInput from "@/components/PlateInput";
import PhoneInput from "@/components/PhoneInput";
import { Car, Mail, ClipboardList } from "lucide-react";

const cardCls = "rounded-2xl bg-white border border-stone-line p-4 transition-shadow hover:shadow-sm";
const sectionTitle = "flex items-center gap-1.5 text-sm font-semibold text-ink mb-3";

export default function BookingDrawerDetailsTab({
  booking,
  onUpdate,
}: {
  booking: any;
  onUpdate: (id: string, changes: Record<string, any>) => void | Promise<void>;
}) {
  const [bk, setBk] = useState(booking);
  const [saving, setSaving] = useState(false);

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
