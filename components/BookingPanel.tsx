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
  onUpdate: (id: string, changes: Record<string, any>) => void;
  onClose: () => void;
}) {
  const [bk, setBk] = useState(booking);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<"sent" | "not_configured" | "failed" | null>(null);

  function apply(changes: Record<string, any>) {
    setBk((prev: any) => ({ ...prev, ...changes }));
    onUpdate(bk.id, changes);
  }

  async function saveDetails() {
    setSaving(true);
    await supabase.from("bookings").update({
      vehicle_make: bk.vehicle_make,
      vehicle_model: bk.vehicle_model,
      vehicle_plate: bk.vehicle_plate,
      customer_email: bk.customer_email,
      customer_contact: bk.customer_contact,
      note: bk.note,
    }).eq("id", bk.id);
    setSaving(false);
    onUpdate(bk.id, {
      vehicle_make: bk.vehicle_make, vehicle_model: bk.vehicle_model,
      vehicle_plate: bk.vehicle_plate, customer_email: bk.customer_email,
      customer_contact: bk.customer_contact, note: bk.note,
    });
  }

  function invoiceLines(method: "cash" | "card") {
    const vehicle = bk.vehicle_make || bk.vehicle_model
      ? `${bk.vehicle_make || ""} ${bk.vehicle_model || ""}${bk.vehicle_plate ? ` (${bk.vehicle_plate})` : ""}`.trim()
      : "";
    return { vehicle };
  }

  function sendWhatsAppInvoice(method: "cash" | "card") {
    apply({ payment_method: method, paid: true });
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
    apply({ payment_method: method, paid: true });
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

  const btnPrimary = "flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl bg-navy text-white shadow-sm hover:bg-navy-light hover:shadow-md active:scale-[0.97] transition-all";
  const btnGhost = "flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl bg-canvas2 text-ink hover:bg-stone-line/60 active:scale-[0.97] transition-all";
  const btnDanger = "flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 active:scale-[0.97] transition-all";

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
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-white/50 font-semibold flex items-center gap-1.5">
                <CalendarClock size={11} />
                {bk.preferred_date ? new Date(bk.preferred_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Booking"}
                {bk.preferred_time ? ` · ${bk.preferred_time}` : ""}
              </p>
              <h3 className="font-display text-xl font-semibold text-white truncate">{bk.customer_name}</h3>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
          <div className="mt-4 bg-white/5 rounded-xl px-3 py-3">
            <BookingStepper status={bk.status} />
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Contact — editable, since a correct country code is what makes the WhatsApp invoice actually send */}
          <div>
            <p className="text-xs text-stone mb-1">Contact</p>
            <PhoneInput value={bk.customer_contact || ""} onChange={(v) => setBk({ ...bk, customer_contact: v })} />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm bg-canvas2 rounded-xl p-3.5">
            <Info label="Service" value={bk.service || "—"} />
            <Info label="Date" value={bk.preferred_date ? new Date(bk.preferred_date).toLocaleDateString() : "—"} />
            <Info label="Time" value={bk.preferred_time || "—"} />
          </div>

          {/* Vehicle */}
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-ink mb-2"><Car size={14} /> Vehicle</p>
            <div className="grid grid-cols-2 gap-2.5">
              <input placeholder="Make" value={bk.vehicle_make || ""} onChange={(e) => setBk({ ...bk, vehicle_make: e.target.value })} className="input" />
              <input placeholder="Model" value={bk.vehicle_model || ""} onChange={(e) => setBk({ ...bk, vehicle_model: e.target.value })} className="input" />
            </div>
            <div className="mt-2.5">
              <PlateInput value={bk.vehicle_plate || ""} onChange={(formatted) => setBk({ ...bk, vehicle_plate: formatted })} />
            </div>
          </div>

          {/* Customer email, for the email invoice option */}
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-ink mb-2"><Mail size={14} /> Customer email</p>
            <input
              type="email"
              placeholder="Optional — needed to send an email invoice"
              value={bk.customer_email || ""}
              onChange={(e) => setBk({ ...bk, customer_email: e.target.value })}
              className="input"
            />
          </div>

          {/* Notes */}
          <div>
            <p className="text-sm font-medium text-ink mb-2">Notes</p>
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

          <div className="h-px bg-stone-line" />

          {/* Status actions — the stepper up top shows where things stand, these move it forward */}
          <div>
            <p className="text-sm font-medium text-ink mb-2">Update status</p>
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
            <>
              <div className="h-px bg-stone-line" />
              <div className="bg-canvas2 rounded-xl p-4">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ink mb-2">
                  <CircleDollarSign size={14} /> Payment {bk.paid && <span className="text-teal-dim text-xs font-medium">· Paid ({bk.payment_method})</span>}
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
            </>
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
