"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { X } from "lucide-react";

export default function ManualBookingForm({
  businessId,
  onAdded,
  onClose,
}: {
  businessId: string;
  onAdded: (booking: any) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        business_id: businessId,
        customer_name: name,
        customer_contact: contact,
        service: service || null,
        preferred_date: date || null,
        preferred_time: time || null,
        status: "confirmed", // it's already real, no need to "request" your own booking
        source: "manual",
      })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      onAdded(data);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-ink">Add a booking</h3>
          <button onClick={onClose} aria-label="Close"><X size={18} className="text-stone" /></button>
        </div>
        <p className="text-sm text-stone mb-4">For appointments that came from outside Luupa — walk-ins, phone calls.</p>
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <input required placeholder="Customer name" value={name} onChange={(e) => setName(e.target.value)} className="input" />
          <input required placeholder="Phone or WhatsApp" value={contact} onChange={(e) => setContact(e.target.value)} className="input" />
          <input placeholder="Service" value={service} onChange={(e) => setService(e.target.value)} className="input" />
          <div className="grid grid-cols-2 gap-2.5">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" />
          </div>
          <button
            disabled={saving}
            className="w-full h-11 rounded-lg bg-terra text-white font-medium hover:bg-terra-dim transition-colors disabled:opacity-60"
          >
            {saving ? "Adding…" : "Add booking"}
          </button>
        </form>
      </div>
    </div>
  );
}
