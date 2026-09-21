"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeWhatsAppNumber } from "@/lib/validation";
import BookingStepper from "@/components/BookingStepper";
import PlateInput from "@/components/PlateInput";
import PhoneInput from "@/components/PhoneInput";
import {
  X, UserCheck, Wrench, CheckCircle2, CircleDollarSign, Car,
  Mail, MessageCircle, Loader2, Check, Ban, UserX, CalendarClock,
  Phone, Copy, CopyCheck, Sparkles, StickyNote, ClipboardList,
} from "lucide-react";

// The old BookingModal popped up as a centered overlay, hiding the calendar
// behind it. This renders the same detail view either as a sticky column
// beside the calendar (desktop — see app/business/bookings/page.tsx) or as a
// bottom sheet (mobile, where there's no room for two columns side by side).
export default function BookingPanel({
  booking,
  businessName,
  paymentQrUrl,
  onUpdate,
  onClose,
}: {
  booking: any;
  businessName: string;
  paymentQrUrl?: string | null;
  onUpdate: (id: string, changes: Record<string, any>) => void | Promise<void>;
  onClose: () => void;
}) {
  const [bk, setBk] = useState(booking);
  const [amount, setAmount] = useState(booking.amount != null ? String(booking.amount) : "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<"sent" | "not_configured" | "failed" | null>(null);

  function apply(changes: Record<string, any>) {
    setBk((prev: any) => ({ ...prev, ...changes }));
    onUpdate(bk.id, changes);
  }

  async function saveDetails() {
    setSaving(true);
    // Was previously also firing its own separate, error-ignored write here
    // before calling onUpdate — which already writes the same fields with
    // proper error handling and optimistic-update rollback. That duplicate
    // write did nothing useful except double the network calls and silently
    // swallow any failure.
    await onUpdate(bk.id, {
      vehicle_make: bk.vehicle_make, vehicle_model: bk.vehicle_model,
      vehicle_plate: bk.vehicle_plate, customer_email: bk.customer_email,
      customer_contact: bk.customer_contact, note: bk.note,
    });
    setSaving(false);
  }

  function copyContact() {
    if (!bk.customer_contact) return;
    navigator.clipboard?.writeText(bk.customer_contact).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function openWhatsAppChat() {
    const number = normalizeWhatsAppNumber(bk.customer_contact || "");
    window.open(`https://wa.me/${number}`, "_blank");
  }

  function invoiceLines(method: "cash" | "card") {
    const vehicle = bk.vehicle_make || bk.vehicle_model
      ? `${bk.vehicle_make || ""} ${bk.vehicle_model || ""}${bk.vehicle_plate ? ` (${bk.vehicle_plate})` : ""}`.trim()
      : "";
    return { vehicle };
  }

  function parsedAmount(): number | null {
    const n = Number(amount);
    return amount.trim() !== "" && !Number.isNaN(n) ? n : null;
  }

  function sendWhatsAppInvoice(method: "cash" | "card") {
    apply({ payment_method: method, paid: true, amount: parsedAmount() });
    const { vehicle } = invoiceLines(method);
    const lines = [
      `Invoice from ${businessName}`,
      `Customer: ${bk.customer_name}`,
      bk.service ? `Service: ${bk.service}` : "",
      vehicle ? `Vehicle: ${vehicle}` : "",
      amount ? `Total: BHD ${amount}` : "",
      `Payment: ${method === "cash" ? "Cash" : "Card"}`,
      paymentQrUrl ? `\nPay via BenefitPay: ${paymentQrUrl}` : "",
      ``,
      `Thank you for choosing ${businessName}!`,
    ].filter(Boolean).join("\n");

    const number = normalizeWhatsAppNumber(bk.customer_contact || "");
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(lines)}`, "_blank");
  }

  async function sendEmailInvoice(method: "cash" | "card") {
    if (!bk.customer_email) return;
    apply({ payment_method: method, paid: true, amount: parsedAmount() });
    setSendingEmail(true);
    setEmailResult(null);
    const { vehicle } = invoiceLines(method);
    const { data: { session } } = await supabase.auth.getSession();

    try {
      const res = await fetch("/api/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          bookingId: bk.id,
          vehicle,
          amount,
          paymentMethod: method,
          qrUrl: paymentQrUrl,
        }),
      });
      const result = await res.json();
      setEmailResult(result.sent ? "sent" : result.reason === "not_configured" ? "not_configured" : "failed");
    } catch {
      setEmailResult("failed");
    }
    setSendingEmail(false);
  }

  const btnPrimary = "flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl bg-navy text-white shadow-sm hover:bg-navy-light hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-150";
  const btnGhost = "flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl bg-canvas2 text-ink hover:bg-stone-line/60 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-150";
  const btnDanger = "flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-150";
  const cardCls = "rounded-2xl bg-white border border-stone-line p-4 transition-shadow hover:shadow-sm";
  const sectionTitle = "flex items-center gap-1.5 text-sm font-semibold text-ink mb-3";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center
                 lg:static lg:inset-auto lg:z-auto lg:bg-transparent lg:block lg:h-full"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="panel-in bg-white rounded-t-2xl lg:rounded-2xl w-full max-h-[92vh]
                   lg:max-h-[calc(100vh-112px)] lg:sticky lg:top-24 overflow-y-auto
                   border-0 lg:border lg:border-stone-line shadow-2xl lg:shadow-sm"
      >
        <div className="sticky top-0 z-10 bg-gradient-to-br from-navy to-navy-dim px-6 py-5 rounded-t-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-3">
              <span className="hidden sm:flex w-11 h-11 rounded-full bg-white/10 border border-white/15 items-center justify-center shrink-0 text-white font-display text-lg font-semibold">
                {bk.customer_name?.[0]?.toUpperCase() || "?"}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-white/50 font-semibold flex items-center gap-1.5">
                  <CalendarClock size={11} />
                  {bk.preferred_date ? new Date(bk.preferred_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Booking"}
                  {bk.preferred_time ? ` · ${bk.preferred_time}` : ""}
                  {bk.source === "manual" && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-[9px] normal-case tracking-normal">Manual entry</span>}
                </p>
                <h3 className="font-display text-xl font-semibold text-white truncate">{bk.customer_name}</h3>
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
              href={bk.customer_contact ? `tel:+${bk.customer_contact}` : undefined}
              aria-label="Call"
              className={`flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 active:scale-90 transition-all ${!bk.customer_contact ? "opacity-40 pointer-events-none" : ""}`}
            >
              <Phone size={14} className="text-white" />
            </a>
            <button
              onClick={openWhatsAppChat}
              disabled={!bk.customer_contact}
              aria-label="WhatsApp"
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 active:scale-90 transition-all disabled:opacity-40"
            >
              <MessageCircle size={14} className="text-white" />
            </button>
            <button
              onClick={copyContact}
              disabled={!bk.customer_contact}
              aria-label="Copy number"
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 active:scale-90 transition-all disabled:opacity-40"
            >
              {copied ? <CopyCheck size={14} className="text-teal-light" /> : <Copy size={14} className="text-white" />}
            </button>
            {bk.status === "completed" && bk.paid && (
              <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-teal-light bg-white/10 px-2.5 py-1.5 rounded-full">
                <Sparkles size={11} /> Completed & paid
              </span>
            )}
          </div>

          <div className="mt-4 bg-white/5 rounded-xl px-3 py-3">
            <BookingStepper status={bk.status} />
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
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

          {/* Notes */}
          <div className={cardCls}>
            <p className={sectionTitle}><StickyNote size={14} /> Notes</p>
            <textarea
              placeholder="Anything worth remembering about this booking…"
              value={bk.note || ""}
              onChange={(e) => setBk({ ...bk, note: e.target.value })}
              className="input h-20 py-2"
            />
          </div>

          <button onClick={saveDetails} disabled={saving} className="text-sm font-semibold text-teal-dim hover:text-teal disabled:opacity-60 transition-colors">
            {saving ? "Saving…" : "Save details"}
          </button>

          {/* Status actions — the stepper up top shows where things stand, these move it forward */}
          <div className={cardCls}>
            <p className={sectionTitle}><CheckCircle2 size={14} /> Update status</p>
            <div className="flex flex-wrap gap-2">
              {bk.status === "pending" && (
                <>
                  <button onClick={() => apply({ status: "confirmed" })} className={btnPrimary}><Check size={14} /> Confirm</button>
                  <button onClick={() => apply({ status: "declined" })} className={btnDanger}><Ban size={14} /> Decline</button>
                </>
              )}
              {bk.status === "confirmed" && (
                <>
                  <button onClick={() => apply({ status: "arrived" })} className={btnPrimary}><UserCheck size={14} /> Customer arrived</button>
                  <button onClick={() => apply({ status: "no_show" })} className={btnGhost}><UserX size={14} /> No-show</button>
                  <button onClick={() => apply({ status: "cancelled" })} className={btnDanger}><Ban size={14} /> Cancel</button>
                </>
              )}
              {bk.status === "arrived" && (
                <button onClick={() => apply({ status: "in_progress" })} className={btnPrimary}><Wrench size={14} /> Car left with us</button>
              )}
              {bk.status === "in_progress" && (
                <button onClick={() => apply({ status: "completed" })} className={btnPrimary}><CheckCircle2 size={14} /> Mark completed</button>
              )}
              {["declined", "no_show", "cancelled", "completed"].includes(bk.status) && (
                <span className="text-xs text-stone self-center">Nothing further to do here.</span>
              )}
            </div>
          </div>

          {/* Payment */}
          {["arrived", "in_progress", "completed"].includes(bk.status) && (
            <div className={`${cardCls} bg-canvas2 border-stone-line`}>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink mb-3">
                <CircleDollarSign size={14} /> Payment {bk.paid && <span className="text-teal-dim text-xs font-medium">· Paid ({bk.payment_method}{bk.amount != null ? ` · BHD ${bk.amount}` : ""})</span>}
              </p>
              {paymentQrUrl && (
                <p className="text-xs text-navy mb-2">Your BenefitPay QR code will be included automatically.</p>
              )}
              <input
                placeholder="Amount (BHD, optional)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input mb-3 bg-white"
              />

              <p className="text-xs text-stone mb-1.5 flex items-center gap-1"><MessageCircle size={11} /> Send invoice via WhatsApp</p>
              <div className="flex gap-2 mb-3">
                <button onClick={() => sendWhatsAppInvoice("cash")} className={`${btnGhost} flex-1 bg-white`}>Cash</button>
                <button onClick={() => sendWhatsAppInvoice("card")} className={`${btnGhost} flex-1 bg-white`}>Card</button>
              </div>

              <p className="text-xs text-stone mb-1.5 flex items-center gap-1"><Mail size={11} /> Or send by email</p>
              <div className="flex gap-2">
                <button
                  onClick={() => sendEmailInvoice("cash")}
                  disabled={!bk.customer_email || sendingEmail}
                  className={`${btnGhost} flex-1 bg-white disabled:opacity-40`}
                >
                  {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : "Cash"}
                </button>
                <button
                  onClick={() => sendEmailInvoice("card")}
                  disabled={!bk.customer_email || sendingEmail}
                  className={`${btnGhost} flex-1 bg-white disabled:opacity-40`}
                >
                  {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : "Card"}
                </button>
              </div>
              {!bk.customer_email && <p className="text-xs text-stone mt-1.5">Add a customer email above to enable this.</p>}
              {emailResult === "sent" && (
                <p className="text-xs text-teal-dim mt-1.5 flex items-center gap-1"><Check size={12} /> Email sent.</p>
              )}
              {emailResult === "not_configured" && (
                <p className="text-xs text-stone mt-1.5">Email sending isn't set up yet on this account.</p>
              )}
              {emailResult === "failed" && (
                <p className="text-xs text-red-600 mt-1.5">Couldn't send that email — try WhatsApp instead for now.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
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
