"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeWhatsAppNumber } from "@/lib/validation";
import { CircleDollarSign, MessageCircle, Mail, Loader2, Check } from "lucide-react";

const cardCls = "rounded-2xl bg-white border border-stone-line p-4 transition-shadow hover:shadow-sm";
const btnGhost = "flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl bg-canvas2 text-ink hover:bg-stone-line/60 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-150";

export default function BookingDrawerPaymentTab({
  booking,
  businessName,
  paymentQrUrl,
  onUpdate,
}: {
  booking: any;
  businessName: string;
  paymentQrUrl?: string | null;
  onUpdate: (id: string, changes: Record<string, any>) => void | Promise<void>;
}) {
  const [bk, setBk] = useState(booking);
  const [amount, setAmount] = useState(booking.amount != null ? String(booking.amount) : "");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<"sent" | "not_configured" | "failed" | null>(null);

  function apply(changes: Record<string, any>) {
    setBk((prev: any) => ({ ...prev, ...changes }));
    onUpdate(bk.id, changes);
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

  return (
    <>
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
    </>
  );
}
