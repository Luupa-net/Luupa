"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  X, UserCheck, Wrench, CheckCircle2, CircleDollarSign, Send, Car,
} from "lucide-react";

export default function BookingModal({
  booking,
  businessName,
  onUpdate,
  onClose,
}: {
  booking: any;
  businessName: string;
  onUpdate: (id: string, changes: Record<string, any>) => void;
  onClose: () => void;
}) {
  const [bk, setBk] = useState(booking);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

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
      note: bk.note,
    }).eq("id", bk.id);
    setSaving(false);
    onUpdate(bk.id, { vehicle_make: bk.vehicle_make, vehicle_model: bk.vehicle_model, vehicle_plate: bk.vehicle_plate, note: bk.note });
  }

  function sendInvoice(method: "cash" | "card") {
    apply({ payment_method: method, paid: true });
    const lines = [
      `Invoice from ${businessName}`,
      `Customer: ${bk.customer_name}`,
      bk.service ? `Service: ${bk.service}` : "",
      bk.vehicle_make || bk.vehicle_model ? `Vehicle: ${bk.vehicle_make || ""} ${bk.vehicle_model || ""}${bk.vehicle_plate ? ` (${bk.vehicle_plate})` : ""}` : "",
      amount ? `Total: BHD ${amount}` : "",
      `Payment: ${method === "cash" ? "Cash" : "Card"}`,
      ``,
      `Thank you for choosing ${businessName}!`,
    ].filter(Boolean).join("\n");

    const digits = (bk.customer_contact || "").replace(/\D/g, "");
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(lines)}`, "_blank");
  }

  const btn = "flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-stone-line">
          <h3 className="font-display text-lg font-semibold text-ink">{bk.customer_name}</h3>
          <button onClick={onClose} aria-label="Close"><X size={18} className="text-stone" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Contact + appointment info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Contact" value={bk.customer_contact} />
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
            <input placeholder="Plate number" value={bk.vehicle_plate || ""} onChange={(e) => setBk({ ...bk, vehicle_plate: e.target.value })} className="input mt-2.5" />
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

          {/* Status workflow */}
          <div>
            <p className="text-sm font-medium text-ink mb-2">Status</p>
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
              {!["pending", "declined", "no_show", "cancelled"].includes(bk.status) && (
                <span className="text-xs text-stone self-center capitalize">Current: {bk.status.replace("_", " ")}</span>
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
                <input
                  placeholder="Amount (BHD, optional)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input mb-2.5"
                />
                <div className="flex gap-2">
                  <button onClick={() => sendInvoice("cash")} className={`${btn} bg-canvas2 text-ink flex-1 justify-center`}>Cash</button>
                  <button onClick={() => sendInvoice("card")} className={`${btn} bg-canvas2 text-ink flex-1 justify-center`}>Card</button>
                </div>
                <p className="text-xs text-stone mt-2 flex items-center gap-1"><Send size={11} /> Sends an invoice message straight to their WhatsApp.</p>
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
