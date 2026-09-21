"use client";

import { useState } from "react";
import Link from "next/link";
import { StickyNote, User } from "lucide-react";
import { normalizeWhatsAppNumber } from "@/lib/validation";

const cardCls = "rounded-2xl bg-white border border-stone-line p-4 transition-shadow hover:shadow-sm";
const sectionTitle = "flex items-center gap-1.5 text-sm font-semibold text-ink mb-3";

export default function BookingDrawerNotesTab({
  booking,
  onUpdate,
}: {
  booking: any;
  onUpdate: (id: string, changes: Record<string, any>) => void | Promise<void>;
}) {
  const [bk, setBk] = useState(booking);
  const [saving, setSaving] = useState(false);

  async function saveNote() {
    setSaving(true);
    await onUpdate(bk.id, { note: bk.note });
    setSaving(false);
  }

  return (
    <>
      {/* Booking-level notes above are specific to this one visit — this
          links out to the customer's full profile (tags, lifetime stats,
          every past booking) instead of duplicating any of that here. */}
      {booking.customer_contact && (
        <Link
          href={`/business/customers/${normalizeWhatsAppNumber(booking.customer_contact)}`}
          className="flex items-center gap-1.5 text-sm font-medium text-navy hover:text-navy-light transition-colors w-fit"
        >
          <User size={14} /> View customer profile
        </Link>
      )}

      <div className={cardCls}>
        <p className={sectionTitle}><StickyNote size={14} /> Notes</p>
        <textarea
          placeholder="Anything worth remembering about this booking…"
          value={bk.note || ""}
          onChange={(e) => setBk({ ...bk, note: e.target.value })}
          className="input h-20 py-2"
        />
      </div>

      <button onClick={saveNote} disabled={saving} className="text-sm font-semibold text-teal-dim hover:text-teal disabled:opacity-60 transition-colors">
        {saving ? "Saving…" : "Save note"}
      </button>
    </>
  );
}
