"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeWhatsAppNumber } from "@/lib/validation";
import {
  CircleDollarSign, MessageCircle, Mail, Loader2, Check,
  ListChecks, Percent, Wallet, Plus, Trash2,
} from "lucide-react";

const cardCls = "rounded-2xl bg-white border border-stone-line p-4 transition-shadow hover:shadow-sm";
const btnGhost = "flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl bg-canvas2 text-ink hover:bg-stone-line/60 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-150";
const sectionTitle = "flex items-center gap-1.5 text-sm font-semibold text-ink mb-3";

type BookingItem = {
  id: string;
  booking_id: string;
  business_id: string;
  description: string;
  qty: number;
  unit_price: number;
  created_at?: string;
};

type BookingPayment = {
  id: string;
  booking_id: string;
  business_id: string;
  type: "deposit" | "balance" | "full" | "refund";
  method: "cash" | "card" | null;
  amount: number;
  created_at?: string;
};

export default function BookingDrawerPaymentTab({
  booking,
  businessName,
  businessId,
  paymentQrUrl,
  onUpdate,
}: {
  booking: any;
  businessName: string;
  businessId: string;
  paymentQrUrl?: string | null;
  onUpdate: (id: string, changes: Record<string, any>) => void | Promise<void>;
}) {
  const [bk, setBk] = useState(booking);
  const [amount, setAmount] = useState(booking.amount != null ? String(booking.amount) : "");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<"sent" | "not_configured" | "failed" | null>(null);

  // Line items
  const [items, setItems] = useState<BookingItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);

  // Discount — plain `bookings` columns, routed through onUpdate like every
  // other field in this drawer. Committed on blur rather than per keystroke
  // to avoid a network round trip on every character typed, while still
  // needing no separate "Save" button.
  const [discountAmountStr, setDiscountAmountStr] = useState(bk.discount_amount != null ? String(bk.discount_amount) : "");
  const [discountNoteStr, setDiscountNoteStr] = useState(bk.discount_note || "");

  // Payment ledger
  const [payments, setPayments] = useState<BookingPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [newPaymentType, setNewPaymentType] = useState<"deposit" | "balance" | "full" | "refund">("deposit");
  const [newPaymentMethod, setNewPaymentMethod] = useState<"" | "cash" | "card">("");
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadItems() {
      const { data } = await supabase
        .from("booking_items")
        .select("*")
        .eq("booking_id", booking.id)
        .order("created_at");
      if (!cancelled) {
        setItems(data || []);
        setItemsLoading(false);
      }
    }
    loadItems();
    return () => { cancelled = true; };
  }, [booking.id]);

  useEffect(() => {
    let cancelled = false;
    async function loadPayments() {
      const { data } = await supabase
        .from("booking_payments")
        .select("*")
        .eq("booking_id", booking.id)
        .order("created_at");
      if (!cancelled) {
        setPayments(data || []);
        setPaymentsLoading(false);
      }
    }
    loadPayments();
    return () => { cancelled = true; };
  }, [booking.id]);

  function apply(changes: Record<string, any>) {
    setBk((prev: any) => ({ ...prev, ...changes }));
    onUpdate(bk.id, changes);
  }

  function invoiceLines() {
    const vehicle = bk.vehicle_make || bk.vehicle_model
      ? `${bk.vehicle_make || ""} ${bk.vehicle_model || ""}${bk.vehicle_plate ? ` (${bk.vehicle_plate})` : ""}`.trim()
      : "";
    const itemLines = items.length > 0
      ? items
          .map((it) => `- ${it.description || "Item"} x${Number(it.qty) || 0} @ BHD ${(Number(it.unit_price) || 0).toFixed(2)} = BHD ${((Number(it.qty) || 0) * (Number(it.unit_price) || 0)).toFixed(2)}`)
          .join("\n")
      : "";
    return { vehicle, itemLines };
  }

  function parsedAmount(): number | null {
    const n = Number(amount);
    return amount.trim() !== "" && !Number.isNaN(n) ? n : null;
  }

  // Line items -------------------------------------------------------------

  function updateItemField(id: string, field: "description" | "qty" | "unit_price", value: any) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  }

  async function saveItem(id: string) {
    const row = items.find((it) => it.id === id);
    if (!row) return;
    const { error } = await supabase
      .from("booking_items")
      .update({ description: row.description, qty: row.qty, unit_price: row.unit_price })
      .eq("id", id);
    if (error) setItemsError("Couldn't save that item — try again.");
  }

  async function addItem() {
    setItemsError(null);
    const { data, error } = await supabase
      .from("booking_items")
      .insert({ booking_id: booking.id, business_id: businessId, description: "", qty: 1, unit_price: 0 })
      .select()
      .single();
    if (error || !data) {
      setItemsError("Couldn't add that item — try again.");
      return;
    }
    setItems((prev) => [...prev, data]);
  }

  async function removeItem(id: string) {
    const previous = items;
    setItems((prev) => prev.filter((it) => it.id !== id));
    const { error } = await supabase.from("booking_items").delete().eq("id", id);
    if (error) {
      setItems(previous);
      setItemsError("Couldn't remove that item — try again.");
    }
  }

  const subtotal = items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.unit_price) || 0), 0);
  const discountAmt = Number(bk.discount_amount) || 0;
  const suggestedAmount = subtotal > 0 ? Math.max(0, subtotal - discountAmt) : null;

  // Discount -----------------------------------------------------------------

  function commitDiscountAmount() {
    const n = Number(discountAmountStr);
    const value = discountAmountStr.trim() !== "" && !Number.isNaN(n) ? n : 0;
    apply({ discount_amount: value });
  }

  function commitDiscountNote() {
    apply({ discount_note: discountNoteStr.trim() || null });
  }

  // Payment ledger -----------------------------------------------------------

  const totalRecorded = payments.reduce(
    (sum, p) => sum + (p.type === "refund" ? -(Number(p.amount) || 0) : (Number(p.amount) || 0)),
    0
  );

  async function addPayment() {
    const n = Number(newPaymentAmount);
    if (newPaymentAmount.trim() === "" || Number.isNaN(n) || n <= 0) {
      setPaymentsError("Enter a valid amount.");
      return;
    }
    setAddingPayment(true);
    setPaymentsError(null);
    const { data, error } = await supabase
      .from("booking_payments")
      .insert({
        booking_id: booking.id,
        business_id: businessId,
        type: newPaymentType,
        method: newPaymentMethod || null,
        amount: n,
      })
      .select()
      .single();
    setAddingPayment(false);
    if (error || !data) {
      setPaymentsError("Couldn't record that payment — try again.");
      return;
    }
    setPayments((prev) => [...prev, data]);
    setNewPaymentAmount("");
    setNewPaymentMethod("");
  }

  // Invoicing ------------------------------------------------------------

  function sendWhatsAppInvoice(method: "cash" | "card") {
    apply({ payment_method: method, paid: true, amount: parsedAmount() });
    const { vehicle, itemLines } = invoiceLines();
    const lines = [
      `Invoice from ${businessName}`,
      `Customer: ${bk.customer_name}`,
      bk.service ? `Service: ${bk.service}` : "",
      vehicle ? `Vehicle: ${vehicle}` : "",
      itemLines ? `\nItems:\n${itemLines}` : "",
      itemLines && subtotal > 0 ? `Subtotal: BHD ${subtotal.toFixed(2)}` : "",
      discountAmt > 0 ? `Discount: -BHD ${discountAmt.toFixed(2)}${bk.discount_note ? ` (${bk.discount_note})` : ""}` : "",
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
    const { vehicle } = invoiceLines();
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
      {/* Line items — optional/additive: a booking that never uses this
          keeps working exactly as before, driven by the single amount field
          in the Payment card below. */}
      <div className={cardCls}>
        <p className={sectionTitle}><ListChecks size={14} /> Line items</p>
        {itemsLoading ? (
          <div className="h-11 bg-canvas2 rounded-lg animate-pulse" />
        ) : items.length === 0 ? (
          <p className="text-sm text-stone mb-3">No line items — using the single amount below.</p>
        ) : (
          <div className="space-y-2 mb-3">
            <div className="grid grid-cols-[1fr_44px_64px_64px_24px] gap-1.5 text-[10px] uppercase tracking-wide text-stone font-semibold px-0.5">
              <span>Description</span><span>Qty</span><span>Price</span><span>Total</span><span />
            </div>
            {items.map((row) => (
              <div key={row.id} className="grid grid-cols-[1fr_44px_64px_64px_24px] gap-1.5 items-center">
                <input
                  value={row.description}
                  onChange={(e) => updateItemField(row.id, "description", e.target.value)}
                  onBlur={() => saveItem(row.id)}
                  placeholder="Item"
                  className="input text-sm py-1.5 px-2"
                />
                <input
                  type="number"
                  min={1}
                  value={row.qty}
                  onChange={(e) => updateItemField(row.id, "qty", Math.max(1, Number(e.target.value) || 1))}
                  onBlur={() => saveItem(row.id)}
                  className="input text-sm py-1.5 px-1.5 text-center"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.unit_price}
                  onChange={(e) => updateItemField(row.id, "unit_price", Number(e.target.value) || 0)}
                  onBlur={() => saveItem(row.id)}
                  className="input text-sm py-1.5 px-1.5 text-right"
                />
                <span className="text-sm text-ink font-medium text-right">
                  {((Number(row.qty) || 0) * (Number(row.unit_price) || 0)).toFixed(2)}
                </span>
                <button
                  onClick={() => removeItem(row.id)}
                  aria-label="Remove item"
                  className="text-stone hover:text-red-600 transition-colors flex justify-center"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        {itemsError && <p className="text-xs text-red-600 mb-2">{itemsError}</p>}
        <div className="flex items-center justify-between">
          <button onClick={addItem} className="flex items-center gap-1 text-xs font-semibold text-teal-dim hover:text-teal transition-colors">
            <Plus size={13} /> Add item
          </button>
          {items.length > 0 && (
            <p className="text-sm text-ink font-semibold">Subtotal: BHD {subtotal.toFixed(2)}</p>
          )}
        </div>
      </div>

      {/* Discount */}
      <div className={cardCls}>
        <p className={sectionTitle}><Percent size={14} /> Discount</p>
        <div className="grid grid-cols-2 gap-2.5">
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Discount (BHD)"
            value={discountAmountStr}
            onChange={(e) => setDiscountAmountStr(e.target.value)}
            onBlur={commitDiscountAmount}
            className="input"
          />
          <input
            placeholder="Reason (optional)"
            value={discountNoteStr}
            onChange={(e) => setDiscountNoteStr(e.target.value)}
            onBlur={commitDiscountNote}
            className="input"
          />
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
          <div className="mb-3">
            <input
              placeholder="Amount (BHD, optional)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input bg-white"
            />
            {suggestedAmount !== null && (
              <button
                type="button"
                onClick={() => setAmount(suggestedAmount.toFixed(2))}
                className="text-xs text-teal-dim hover:text-teal font-medium mt-1.5"
              >
                Use suggested amount — BHD {suggestedAmount.toFixed(2)} (subtotal{discountAmt > 0 ? " minus discount" : ""})
              </button>
            )}
          </div>

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

      {/* Payment ledger — deposits/balances/refunds recorded against this
          booking, independent of the invoice text above. */}
      <div className={cardCls}>
        <p className={sectionTitle}><Wallet size={14} /> Payments</p>
        {paymentsLoading ? (
          <div className="h-11 bg-canvas2 rounded-lg animate-pulse" />
        ) : payments.length === 0 ? (
          <p className="text-sm text-stone mb-3">No payments recorded yet.</p>
        ) : (
          <div className="space-y-1.5 mb-3">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm bg-canvas2 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <span className="font-medium text-ink capitalize">{p.type}</span>
                  {p.method && <span className="text-stone"> · {p.method}</span>}
                  <span className="text-stone"> · {p.created_at ? new Date(p.created_at).toLocaleDateString() : ""}</span>
                </div>
                <span className={`font-semibold shrink-0 ${p.type === "refund" ? "text-red-600" : "text-ink"}`}>
                  {p.type === "refund" ? "-" : ""}BHD {(Number(p.amount) || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="text-sm font-semibold text-ink mb-3">Total recorded: BHD {totalRecorded.toFixed(2)}</p>

        {paymentsError && <p className="text-xs text-red-600 mb-2">{paymentsError}</p>}
        <div className="grid grid-cols-3 gap-2 mb-2">
          <select value={newPaymentType} onChange={(e) => setNewPaymentType(e.target.value as any)} className="input text-sm">
            <option value="deposit">Deposit</option>
            <option value="balance">Balance</option>
            <option value="full">Full</option>
            <option value="refund">Refund</option>
          </select>
          <select value={newPaymentMethod} onChange={(e) => setNewPaymentMethod(e.target.value as any)} className="input text-sm">
            <option value="">Method</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
          </select>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Amount"
            value={newPaymentAmount}
            onChange={(e) => setNewPaymentAmount(e.target.value)}
            className="input text-sm"
          />
        </div>
        <button onClick={addPayment} disabled={addingPayment} className={`${btnGhost} w-full disabled:opacity-60`}>
          {addingPayment ? <Loader2 size={14} className="animate-spin" /> : "Record payment"}
        </button>
      </div>
    </>
  );
}
