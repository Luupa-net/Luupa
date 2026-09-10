"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { CalendarPlus, Check } from "lucide-react";

export default function BookingForm({
  businessId,
  services,
}: {
  businessId: string;
  services?: { name: string; price?: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [service, setService] = useState(services?.[0]?.name || "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const { error } = await supabase.from("bookings").insert({
      business_id: businessId,
      customer_name: name,
      customer_contact: contact,
      service: service || null,
      preferred_date: date || null,
      preferred_time: time || null,
      note,
    });
    setSending(false);
    if (!error) setSent(true);
  }

  if (sent) {
    return (
      <div className="flex items-center gap-2 text-sm text-navy bg-navy/5 rounded-lg px-4 py-3 mt-3">
        <Check size={15} /> Request sent — they'll confirm with you directly.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 mt-3 text-sm font-medium text-navy border border-navy/20 rounded-lg px-4 py-2.5 hover:bg-navy/5 transition-colors"
      >
        <CalendarPlus size={15} /> Request an appointment
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2.5 bg-canvas2 rounded-lg p-4">
      <input
        required
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="input"
      />
      <input
        required
        placeholder="Phone or WhatsApp"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        className="input"
      />

      {services && services.length > 0 ? (
        <select value={service} onChange={(e) => setService(e.target.value)} className="input">
          {services.map((s) => (
            <option key={s.name} value={s.name}>{s.name}</option>
          ))}
        </select>
      ) : (
        <input
          placeholder="What service do you need?"
          value={service}
          onChange={(e) => setService(e.target.value)}
          className="input"
        />
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" />
      </div>
      <textarea
        placeholder="Anything else? (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="input h-16 py-2"
      />
      <p className="text-xs text-stone">This is a request — the business will confirm with you directly, it's not automatically booked yet.</p>
      <button
        disabled={sending}
        className="w-full h-11 rounded-lg bg-terra text-white font-medium hover:bg-terra-dim transition-colors disabled:opacity-60"
      >
        {sending ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
