"use client";

import { useEffect, useState } from "react";
import { normalizeWhatsAppNumber } from "@/lib/validation";
import BookingStepper from "@/components/BookingStepper";
import BookingDrawerDetailsTab from "@/components/BookingDrawerDetailsTab";
import BookingDrawerPaymentTab from "@/components/BookingDrawerPaymentTab";
import BookingDrawerHistoryTab from "@/components/BookingDrawerHistoryTab";
import BookingDrawerNotesTab from "@/components/BookingDrawerNotesTab";
import {
  X, CalendarClock, Phone, MessageCircle, Copy, CopyCheck, Sparkles,
  ClipboardList, CircleDollarSign, CheckCircle2, StickyNote,
} from "lucide-react";

type Tab = "details" | "payment" | "history" | "notes";

const TABS = [
  { key: "details" as const, label: "Details", icon: ClipboardList },
  { key: "payment" as const, label: "Payment", icon: CircleDollarSign },
  { key: "history" as const, label: "History", icon: CheckCircle2 },
  { key: "notes" as const, label: "Notes", icon: StickyNote },
];

// This is the "chrome" layer for the booking detail view: header + tab bar
// live here and never remount when the selected booking changes (no more
// key={selected.id} forcing a full remount/flicker on every click). Only
// the active tab's content below is keyed by booking id, so its own local
// state resets on selection change while the header/tabs stay put. The
// scrollable region also gets overscroll-contain, so scrolling past the
// bottom of the drawer no longer chains into the page behind it.
export default function BookingDrawer({
  booking,
  businessName,
  paymentQrUrl,
  business,
  onUpdate,
  onClose,
}: {
  booking: any;
  businessName: string;
  paymentQrUrl?: string | null;
  business: any;
  onUpdate: (id: string, changes: Record<string, any>) => void | Promise<void>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("details");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function copyContact() {
    if (!booking.customer_contact) return;
    navigator.clipboard?.writeText(booking.customer_contact).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function openWhatsAppChat() {
    const number = normalizeWhatsAppNumber(booking.customer_contact || "");
    window.open(`https://wa.me/${number}`, "_blank");
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center
                 lg:static lg:inset-auto lg:z-auto lg:bg-transparent lg:block"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="panel-in bg-white rounded-t-2xl w-full max-h-[92vh] flex flex-col overflow-hidden
                   border-0 shadow-2xl
                   lg:fixed lg:z-40 lg:right-0 lg:top-24 lg:bottom-0 lg:w-[460px] lg:max-h-none
                   lg:rounded-none lg:border-0 lg:border-l lg:border-stone-line lg:shadow-2xl"
      >
        <div className="shrink-0 bg-gradient-to-br from-navy to-navy-dim px-6 py-5 rounded-t-2xl lg:rounded-none">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-3">
              <span className="hidden sm:flex w-11 h-11 rounded-full bg-white/10 border border-white/15 items-center justify-center shrink-0 text-white font-display text-lg font-semibold">
                {booking.customer_name?.[0]?.toUpperCase() || "?"}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-white/50 font-semibold flex items-center gap-1.5">
                  <CalendarClock size={11} />
                  {booking.preferred_date ? new Date(booking.preferred_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Booking"}
                  {booking.preferred_time ? ` · ${booking.preferred_time}` : ""}
                  {booking.source === "manual" && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-[9px] normal-case tracking-normal">Manual entry</span>}
                </p>
                <h3 className="font-display text-xl font-semibold text-white truncate">{booking.customer_name}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center transition-all"
            >
              <X size={16} className="text-white" />
            </button>
          </div>

          {/* Quick contact — one tap to call, WhatsApp, or copy the number,
              instead of hunting for it further down in the edit fields. */}
          <div className="mt-4 flex items-center gap-2">
            <a
              href={booking.customer_contact ? `tel:+${booking.customer_contact}` : undefined}
              aria-label="Call"
              className={`flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 active:scale-90 transition-all ${!booking.customer_contact ? "opacity-40 pointer-events-none" : ""}`}
            >
              <Phone size={14} className="text-white" />
            </a>
            <button
              onClick={openWhatsAppChat}
              disabled={!booking.customer_contact}
              aria-label="WhatsApp"
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 active:scale-90 transition-all disabled:opacity-40"
            >
              <MessageCircle size={14} className="text-white" />
            </button>
            <button
              onClick={copyContact}
              disabled={!booking.customer_contact}
              aria-label="Copy number"
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 active:scale-90 transition-all disabled:opacity-40"
            >
              {copied ? <CopyCheck size={14} className="text-teal-light" /> : <Copy size={14} className="text-white" />}
            </button>
            {booking.status === "completed" && booking.paid && (
              <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-teal-light bg-white/10 px-2.5 py-1.5 rounded-full">
                <Sparkles size={11} /> Completed & paid
              </span>
            )}
          </div>

          <div className="mt-4 bg-white/5 rounded-xl px-3 py-3">
            <BookingStepper status={booking.status} />
          </div>
        </div>

        <div className="shrink-0 flex gap-2 border-b border-stone-line px-4 sm:px-6 bg-white overflow-x-auto no-scrollbar">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-2 py-3 text-sm font-medium border-b-2 -mb-px shrink-0 transition-colors ${
                tab === key ? "border-teal text-ink" : "border-transparent text-stone hover:text-ink"
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4">
          {tab === "details" && <BookingDrawerDetailsTab key={booking.id} booking={booking} businessId={business.id} onUpdate={onUpdate} />}
          {tab === "payment" && <BookingDrawerPaymentTab key={booking.id} booking={booking} businessName={businessName} paymentQrUrl={paymentQrUrl} onUpdate={onUpdate} />}
          {tab === "history" && <BookingDrawerHistoryTab key={booking.id} booking={booking} onUpdate={onUpdate} />}
          {tab === "notes" && <BookingDrawerNotesTab key={booking.id} booking={booking} onUpdate={onUpdate} />}
        </div>
      </div>
    </div>
  );
}
