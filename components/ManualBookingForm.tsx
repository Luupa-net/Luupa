"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { X } from "lucide-react";
import PhoneInput from "@/components/PhoneInput";
import PlateInput from "@/components/PlateInput";

export default function ManualBookingForm({
  businessId,
  onAdded,
  onClose,
  initialName = "",
  initialContact = "",
}: {
  businessId: string;
  onAdded: (booking: any) => void;
  onClose: () => void;
  initialName?: string;
  initialContact?: string;
}) {
  const [name, setName] = useState(initialName);
  const [contact, setContact] = useState(initialContact);
  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
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
        vehicle_make: vehicleMake || null,
        vehicle_model: vehicleModel || null,
        vehicle_plate: vehiclePlate || null,
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
          <PhoneInput value={contact} onChange={setContact} placeholder="Phone or WhatsApp" />
          <input placeholder="Service" value={service} onChange={(e) => setService(e.target.value)} className="input" />
          <div className="grid grid-cols-2 gap-2.5">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <input placeholder="Vehicle make" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} className="input" />
            <input placeholder="Vehicle model" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} className="input" />
          </div>
          <PlateInput value={vehiclePlate} onChange={setVehiclePlate} />
          <button
            disabled={saving}
            className="w-full h-11 rounded-lg bg-teal text-white font-medium hover:bg-teal-dim transition-colors disabled:opacity-60"
          >
            {saving ? "Adding…" : "Add booking"}
          </button>
        </form>
      </div>
    </div>
  );
}
