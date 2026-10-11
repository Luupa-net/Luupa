"use client";

import { useState } from "react";
import Link from "next/link";
import { StickyNote, User, Check } from "lucide-react";
import { normalizeWhatsAppNumber } from "@/lib/validation";

const cardCls = "rounded-2xl bg-white border border-stone-line p-4 transition-shadow hover:shadow-sm";
const sectionTitle = "flex items-center gap-1.5 text-sm font-semibold text-ink mb-3";

export default function BookingDrawerNotesTab({
  booking,
  isStaff,
  onUpdate,
}: {
  booking: any;
  isStaff?: boolean;
  onUpdate: (id: string, changes: Record<string, any>) => void | Promise<void>;
}) {
  const [note, setNote] = useState<string>(booking.note || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = note !== (booking.note || "");

  async function saveNote() {
    setSaving(true);
    await onUpdate(booking.id, { note: note.trim() || null });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      {/* Booking-level notes below are specific to this one visit — this
          links out to the customer's full profile (tags, lifetime stats,
          every past booking) instead of duplicating any of that here.
          Owner only: the customer CRM carries revenue figures. */}
      {!isStaff && booking.customer_contact && (
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
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
          className="input h-24 py-2"
        />
      </div>

      <div className="flex items-center gap-3">
        <button onClick={saveNote} disabled={saving || !dirty} className="text-sm font-semibold text-teal-dim hover:text-teal disabled:opacity-60 transition-colors">
          {saving ? "Saving…" : "Save note"}
        </button>
        {saved && <span className="flex items-center gap-1 text-xs text-teal-dim"><Check size={13} /> Saved</span>}
      </div>
    </>
  );
}
