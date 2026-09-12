"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { MessageSquarePlus, Check } from "lucide-react";
import PhoneInput from "@/components/PhoneInput";

export default function RequestQuoteForm({ businessId }: { businessId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const { error } = await supabase.from("inquiries").insert({
      business_id: businessId,
      customer_name: name,
      customer_contact: contact,
      message,
    });
    setSending(false);
    if (!error) setSent(true);
  }

  if (sent) {
    return (
      <div className="flex items-center gap-2 text-sm text-navy bg-navy/5 rounded-lg px-4 py-3 mt-3">
        <Check size={15} /> Sent — they'll be able to see this in their inbox.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 mt-3 text-sm font-medium text-navy border border-navy/20 rounded-lg px-4 py-2.5 hover:bg-navy/5 transition-colors"
      >
        <MessageSquarePlus size={15} /> Request a quote instead
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
      <PhoneInput value={contact} onChange={setContact} placeholder="Phone or WhatsApp" />
      <textarea
        placeholder="What do you need? (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="input h-20 py-2"
      />
      <button
        disabled={sending}
        className="w-full h-11 rounded-lg bg-terra text-white font-medium hover:bg-terra-dim transition-colors disabled:opacity-60"
      >
        {sending ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
