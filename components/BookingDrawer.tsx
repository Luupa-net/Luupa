"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeWhatsAppNumber } from "@/lib/validation";
import { useBookingKeyboardShortcuts } from "@/lib/useBookingKeyboardShortcuts";
import BookingStepper from "@/components/BookingStepper";
import BookingDrawerDetailsTab from "@/components/BookingDrawerDetailsTab";
import BookingDrawerPaymentTab from "@/components/BookingDrawerPaymentTab";
import BookingDrawerHistoryTab from "@/components/BookingDrawerHistoryTab";
import BookingDrawerNotesTab from "@/components/BookingDrawerNotesTab";
import {
  X, CalendarClock, Phone, MessageCircle, Copy, CopyCheck, Sparkles,
  ClipboardList, CircleDollarSign, CheckCircle2, StickyNote, MessageSquareText,
} from "lucide-react";

export type Tab = "details" | "payment" | "history" | "notes";

const ALL_TABS = [
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
  business,
  isStaff,
  initialTab = "details",
  onUpdate,
  onPatched,
  onClose,
}: {
  booking: any;
  business: any;
  isStaff?: boolean;
  initialTab?: Tab;
  onUpdate: (id: string, changes: Record<string, any>) => void | Promise<void>;
  // Merge a full row the server already saved (e.g. checkout's result) into
  // local state, without another write.
  onPatched: (row: any) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>(isStaff && initialTab === "payment" ? "details" : initialTab);
  const [copied, setCopied] = useState(false);
  // Payment (amounts, discounts, invoicing) is owner/manager only — see
  // migration-v23.sql for why staff can't reach the underlying figures even
  // via a direct API call, this just keeps the UI from offering a tab that
  // would have nothing real to show.
  const TABS = isStaff ? ALL_TABS.filter((t) => t.key !== "payment") : ALL_TABS;

  // Locking body scroll only makes sense on mobile, where this renders as a
  // full-screen bottom sheet. On desktop (lg+) it's a right-side panel that
  // leaves the calendar visible and interactive, so locking the page there
  // just froze the calendar underneath and made it impossible to scroll back
  // up to buttons like "Add booking" above the current scroll position.
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    function sync() {
      document.body.style.overflow = mql.matches ? "" : "hidden";
    }
    sync();
    mql.addEventListener("change", sync);
    return () => {
      mql.removeEventListener("change", sync);
      document.body.style.overflow = "";
    };
  }, []);

  // Bound here in the chrome layer (not per-tab) so shortcuts keep working
  // regardless of which tab is active. Fires the same onUpdate prop every
  // status button in the History tab already calls — see
  // lib/useBookingKeyboardShortcuts.ts for the full key mapping.
  useBookingKeyboardShortcuts(booking.status, {
    onConfirm: () => onUpdate(booking.id, { status: "confirmed" }),
    onDecline: () => onUpdate(booking.id, { status: "declined" }),
    onArrived: () => onUpdate(booking.id, { status: "arrived" }),
    onNoShow: () => onUpdate(booking.id, { status: "no_show" }),
    onCancel: () => onUpdate(booking.id, { status: "cancelled" }),
    onInProgress: () => onUpdate(booking.id, { status: "in_progress" }),
    // Completion goes through checkout unless it's already paid — the
    // database refuses an unpaid completion anyway.
    onComplete: () => (booking.paid ? onUpdate(booking.id, { status: "completed" }) : !isStaff && setTab("payment")),
  });

  function copyContact() {
    if (!booking.customer_contact) return;
    navigator.clipboard?.writeText(booking.customer_contact).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  // A real <a href> instead of a window.open() call in an onClick — some
  // browsers' popup blockers silently swallow window.open() even from a
  // direct click handler, which was exactly why this button could look like
  // it "did nothing." A native anchor navigation is never blocked that way.
  const phoneDigits = booking.customer_contact ? normalizeWhatsAppNumber(booking.customer_contact) : "";
  const whatsappHref = phoneDigits ? `https://wa.me/${phoneDigits}` : undefined;
  const dateLabel = booking.preferred_date
    ? new Date(`${booking.preferred_date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center
                 lg:static lg:inset-auto lg:z-auto lg:bg-transparent lg:block"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="panel-in bg-white rounded-t-2xl w-full max-h-[92vh] flex flex-col overflow-hidden
                   border-0 shadow-2xl
                   lg:fixed lg:z-40 lg:right-0 lg:top-16 lg:bottom-0 lg:w-[460px] lg:max-h-none
                   lg:rounded-none lg:border-0 lg:border-l lg:border-stone-line lg:shadow-2xl"
      >
        <div className="shrink-0 bg-gradient-to-br from-navy to-navy-dim px-6 pt-5 pb-4 rounded-t-2xl lg:rounded-none space-y-4">
          <div className="flex items-center justify-between gap-3 fade-up" style={{ animationDuration: "0.35s" }}>
            <div className="min-w-0 flex items-center gap-3">
              <span className="hidden sm:flex w-11 h-11 rounded-full bg-white/10 border border-white/15 items-center justify-center shrink-0 text-white font-display text-lg font-semibold">
                {booking.customer_name?.[0]?.toUpperCase() || "?"}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-white/50 font-semibold flex items-center gap-1.5">
                  <CalendarClock size={11} />
                  {dateLabel ?? "Booking"}
                  {booking.preferred_time ? ` · ${booking.preferred_time}` : ""}
                  {booking.source === "manual" && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-[9px] normal-case tracking-normal">Manual entry</span>}
                </p>
                <h3 className="font-display text-xl font-semibold text-white truncate">{booking.customer_name}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="group shrink-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center transition-all"
            >
              <X size={16} className="text-white transition-transform duration-200 group-hover:rotate-90" />
            </button>
          </div>

          {/* Quick contact — one tap to call, WhatsApp, or copy the number,
              instead of hunting for it further down in the edit fields. */}
          <div className="flex items-center gap-2 fade-up" style={{ animationDuration: "0.35s", animationDelay: "0.04s" }}>
            <a
              href={phoneDigits ? `tel:+${phoneDigits}` : undefined}
              aria-label="Call"
              title="Call"
              className={`flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 hover:-translate-y-0.5 active:scale-90 active:translate-y-0 transition-all ${!phoneDigits ? "opacity-40 pointer-events-none" : ""}`}
            >
              <Phone size={14} className="text-white" />
            </a>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Message on WhatsApp"
              title="Message on WhatsApp"
              className={`flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 hover:-translate-y-0.5 active:scale-90 active:translate-y-0 transition-all ${!whatsappHref ? "opacity-40 pointer-events-none" : ""}`}
            >
              <MessageCircle size={14} className="text-white" />
            </a>
            <button
              onClick={copyContact}
              disabled={!booking.customer_contact}
              aria-label="Copy number"
              title="Copy number"
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 hover:-translate-y-0.5 active:scale-90 active:translate-y-0 transition-all disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {copied ? <CopyCheck size={14} className="text-teal-light" /> : <Copy size={14} className="text-white" />}
            </button>
            {phoneDigits && <QuickMessages booking={booking} businessName={business?.name || "us"} phone={phoneDigits} dateLabel={dateLabel} />}
            {booking.status === "completed" && booking.paid ? (
              <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-teal-light bg-white/10 px-2.5 py-1.5 rounded-full">
                <Sparkles size={11} /> Completed & paid
              </span>
            ) : booking.paid ? (
              <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-teal-light bg-white/10 px-2.5 py-1.5 rounded-full">
                <CircleDollarSign size={11} /> Paid
              </span>
            ) : !isStaff && ["arrived", "in_progress"].includes(booking.status) ? (
              <button
                onClick={() => setTab("payment")}
                className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-navy bg-teal-light hover:bg-white px-2.5 py-1.5 rounded-full transition-colors"
              >
                <CircleDollarSign size={11} /> Checkout
              </button>
            ) : null}
          </div>

          <div className="bg-white/5 rounded-xl px-3 py-3.5 fade-up" style={{ animationDuration: "0.35s", animationDelay: "0.08s" }}>
            <BookingStepper status={booking.status} />
          </div>
        </div>

        <div className="shrink-0 flex gap-1 border-b border-stone-line px-3 sm:px-5 bg-white overflow-x-auto no-scrollbar">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 -mb-px shrink-0 transition-colors ${
                tab === key ? "border-teal text-ink" : "border-transparent text-stone hover:text-ink hover:border-stone-line"
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <div key={tab} className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4 fade-up" style={{ animationDuration: "0.2s" }}>
          {tab === "details" && (
            <BookingDrawerDetailsTab
              key={booking.id}
              booking={booking}
              businessId={business.id}
              isStaff={isStaff}
              onUpdate={onUpdate}
              onRequestCheckout={() => setTab("payment")}
            />
          )}
          {tab === "payment" && !isStaff && (
            <BookingDrawerPaymentTab key={booking.id} booking={booking} business={business} businessId={business.id} onUpdate={onUpdate} onPatched={onPatched} />
          )}
          {tab === "history" && <BookingDrawerHistoryTab key={booking.id} booking={booking} />}
          {tab === "notes" && <BookingDrawerNotesTab key={booking.id} booking={booking} isStaff={isStaff} onUpdate={onUpdate} />}
        </div>
      </div>
    </div>
  );
}

// One-tap WhatsApp messages for the moments that happen every day at a car
// care shop — each opens the customer's chat with the text already written,
// so the owner/staff just hits Send.
function QuickMessages({ booking, businessName, phone, dateLabel }: { booking: any; businessName: string; phone: string; dateLabel: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const first = String(booking.customer_name || "").split(" ")[0] || "there";
  const when = [dateLabel, booking.preferred_time].filter(Boolean).join(" at ");
  const vehicle = [booking.vehicle_make, booking.vehicle_model].filter(Boolean).join(" ") || "car";
  const templates = [
    { label: "Booking confirmed", text: `Hi ${first}, your booking at ${businessName}${booking.service ? ` for ${booking.service}` : ""} is confirmed${when ? ` for ${when}` : ""}. See you then!` },
    { label: "Reminder", text: `Hi ${first}, a friendly reminder of your booking at ${businessName}${when ? ` on ${when}` : ""}. Reply here if anything changes.` },
    { label: "Running a little late", text: `Hi ${first}, a quick heads-up from ${businessName}: we're running about 15 minutes behind today. Sorry for the wait, and thanks for your patience!` },
    { label: "Car is ready", text: `Hi ${first}, good news — your ${vehicle} is ready for pickup at ${businessName}. See you soon!` },
    { label: "Thank you", text: `Hi ${first}, thank you for choosing ${businessName} today! We'd love to see you again.` },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Quick WhatsApp messages"
        title="Quick WhatsApp messages"
        aria-expanded={open}
        className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold hover:-translate-y-0.5 active:scale-95 transition-all"
      >
        <MessageSquareText size={14} /> <span className="hidden sm:inline">Quick message</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-xl border border-stone-line shadow-2xl shadow-black/15 py-1.5 z-20 fade-up" style={{ animationDuration: "0.15s" }}>
          <p className="px-3.5 pt-1 pb-2 text-[10px] uppercase tracking-wider font-semibold text-stone">Send on WhatsApp</p>
          {templates.map((t) => (
            <a
              key={t.label}
              href={`https://wa.me/${phone}?text=${encodeURIComponent(t.text)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="block px-3.5 py-2 hover:bg-canvas2 transition-colors"
            >
              <span className="block text-sm font-medium text-ink">{t.label}</span>
              <span className="block text-[11px] text-stone truncate">{t.text}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
