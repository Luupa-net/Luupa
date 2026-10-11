"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, AlertCircle, Loader2 } from "lucide-react";
import PhoneInput from "@/components/PhoneInput";
import PlateInput from "@/components/PlateInput";

export default function ManualBookingForm({
  businessId,
  isStaff = false,
  onAdded,
  onClose,
  initialName = "",
  initialContact = "",
  initialEmail = "",
}: {
  businessId: string;
  isStaff?: boolean;
  onAdded: (booking: any) => void;
  onClose: () => void;
  initialName?: string;
  initialContact?: string;
  initialEmail?: string;
}) {
  const [name, setName] = useState(initialName);
  const [contact, setContact] = useState(initialContact);
  const [email, setEmail] = useState(initialEmail);
  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    // A bare country code ("973") means the number field was left empty.
    const phoneDigits = contact.replace(/\D/g, "");
    const fields = {
      customer_name: name.trim(),
      customer_contact: phoneDigits.length >= 8 ? phoneDigits : "",
      customer_email: email.trim() || null,
      service: service.trim() || null,
      preferred_date: date || null,
      preferred_time: time || null,
      vehicle_make: vehicleMake.trim() || null,
      vehicle_model: vehicleModel.trim() || null,
      vehicle_plate: vehiclePlate || null,
    };

    if (isStaff) {
      // Staff can't read the base bookings table (revenue columns), so an
      // INSERT ... RETURNING errors for them — they go through a narrow RPC
      // (migration-v30) and read the new row back from the staff view.
      const { data: newId, error: rpcError } = await supabase.rpc("create_staff_booking", { p_booking: fields });
      if (rpcError || !newId) {
        setSaving(false);
        setError(rpcError?.message || "Couldn't add that booking — try again.");
        return;
      }
      const { data: row } = await supabase.from("bookings_operational").select("*").eq("id", newId).maybeSingle();
      setSaving(false);
      onAdded(row ?? { id: newId, business_id: businessId, ...fields, status: "confirmed", source: "manual", created_at: new Date().toISOString() });
      onClose();
      return;
    }

    const { data, error: insertError } = await supabase
      .from("bookings")
      .insert({
        business_id: businessId,
        ...fields,
        status: "confirmed", // it's already real, no need to "request" your own booking
        source: "manual",
      })
      .select()
      .single();
    setSaving(false);
    if (!insertError && data) {
      onAdded(data);
      onClose();
      return;
    }
    setError(insertError?.message || "Couldn't add that booking — try again.");
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto panel-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-ink">Add a booking</h3>
          <button onClick={onClose} aria-label="Close"><X size={18} className="text-stone" /></button>
        </div>
        <p className="text-sm text-stone mb-4">For appointments that came from outside Luupa — walk-ins, phone calls.</p>
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <input required placeholder="Customer name" value={name} onChange={(e) => setName(e.target.value)} className="input" />
          <PhoneInput value={contact} onChange={setContact} placeholder="Phone or WhatsApp" />
          <input
            type="email"
            placeholder="Email (optional — for the emailed receipt)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
          <input placeholder="Service" value={service} onChange={(e) => setService(e.target.value)} className="input" />
          <div className="grid grid-cols-2 gap-2.5">
            <input type="date" aria-label="Date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
            <input type="time" aria-label="Time" value={time} onChange={(e) => setTime(e.target.value)} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <input placeholder="Vehicle make" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} className="input" />
            <input placeholder="Vehicle model" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} className="input" />
          </div>
          <PlateInput value={vehiclePlate} onChange={setVehiclePlate} />
          {error && (
            <p className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </p>
          )}
          <button
            disabled={saving || !name.trim()}
            className="w-full h-11 rounded-lg bg-teal text-white font-medium hover:bg-teal-dim transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Adding…" : "Add booking"}
          </button>
        </form>
      </div>
    </div>
  );
}
