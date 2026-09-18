"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeWhatsAppNumber } from "@/lib/validation";
import BookingStepper from "@/components/BookingStepper";
import PlateInput from "@/components/PlateInput";
import PhoneInput from "@/components/PhoneInput";
import {
  X, UserCheck, Wrench, CheckCircle2, CircleDollarSign, Car,
  Mail, MessageCircle, Loader2, Check,
} from "lucide-react";

export default function BookingModal({
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

  const btn = "flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-navy px-6 py-5 rounded-t-2xl sm:rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold text-white">{bk.customer_name}</h3>
            <button onClick={onClose} aria-label="Close"><X size={18} className="text-white/70 hover:text-white" /></button>
          </div>
          <div className="mt-4">
            <BookingStepper status={bk.status} />
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Contact — editable, since a correct country code is what makes the WhatsApp invoice actually send */}
          <div>
            <p className="text-xs text-stone mb-1">Contact</p>
            <PhoneInput value={bk.customer_contact || ""} onChange={(v) => setBk({ ...bk, customer_contact: v })} />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
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

          <button onClick={saveDetails} disabled={saving} className="text-sm font-medium text-navy disabled:opacity-60">
            {saving ? "Saving…" : "Save details"}
          </button>

          <div className="h-px bg-stone-line" />

          {/* Status actions — the stepper up top shows where things stand, these move it forward */}
          <div>
            <p className="text-sm font-medium text-ink mb-2">Update status</p>
            <div className="flex flex-wrap gap-2">
              {bk.status === "pending" && (
                <>
                  <button onClick={() => apply({ status: "confirmed" })} className={`${btn} bg-navy text-white`}>Confirm</button>
                  <button onClick={() => apply({ status: "declined" })} className={`${btn} border border-red-200 text-red-600`}>Decline</button>
                </>
              )}
              {bk.status === "confirmed" && (
                <>
                  <button onClick={() => apply({ status: "arrived" })} className={`${btn} bg-navy text-white`}><UserCheck size={14} /> Customer arrived</button>
                  <button onClick={() => apply({ status: "no_show" })} className={`${btn} border border-stone-line text-stone`}>No-show</button>
                  <button onClick={() => apply({ status: "cancelled" })} className={`${btn} border border-red-200 text-red-600`}>Cancel</button>
                </>
              )}
              {bk.status === "arrived" && (
                <button onClick={() => apply({ status: "in_progress" })} className={`${btn} bg-navy text-white`}><Wrench size={14} /> Car left with us</button>
              )}
              {bk.status === "in_progress" && (
                <button onClick={() => apply({ status: "completed" })} className={`${btn} bg-navy text-white`}><CheckCircle2 size={14} /> Mark completed</button>
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
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-ink mb-2">
                  <CircleDollarSign size={14} /> Payment {bk.paid && <span className="text-emerald-600 text-xs">· Paid ({bk.payment_method})</span>}
                </p>
                {paymentQrUrl && (
                  <p className="text-xs text-navy mb-2">Your BenefitPay QR code will be included automatically.</p>
                )}
                <input
                  placeholder="Amount (BHD, optional)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input mb-3"
                />

                <p className="text-xs text-stone mb-1.5 flex items-center gap-1"><MessageCircle size={11} /> Send invoice via WhatsApp</p>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => sendWhatsAppInvoice("cash")} className={`${btn} bg-canvas2 text-ink flex-1 justify-center`}>Cash</button>
                  <button onClick={() => sendWhatsAppInvoice("card")} className={`${btn} bg-canvas2 text-ink flex-1 justify-center`}>Card</button>
                </div>

                <p className="text-xs text-stone mb-1.5 flex items-center gap-1"><Mail size={11} /> Or send by email</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => sendEmailInvoice("cash")}
                    disabled={!bk.customer_email || sendingEmail}
                    className={`${btn} bg-canvas2 text-ink flex-1 justify-center disabled:opacity-40`}
                  >
                    {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : "Cash"}
                  </button>
                  <button
                    onClick={() => sendEmailInvoice("card")}
                    disabled={!bk.customer_email || sendingEmail}
                    className={`${btn} bg-canvas2 text-ink flex-1 justify-center disabled:opacity-40`}
                  >
                    {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : "Card"}
                  </button>
                </div>
                {!bk.customer_email && <p className="text-xs text-stone mt-1.5">Add a customer email above to enable this.</p>}
                {emailResult === "sent" && (
                  <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1"><Check size={12} /> Email sent.</p>
                )}
                {emailResult === "not_configured" && (
                  <p className="text-xs text-terra-dim mt-1.5">Email sending isn't set up yet on this account.</p>
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
