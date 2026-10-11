"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeWhatsAppNumber } from "@/lib/validation";
import { formatBhd, parseAmount, priceFromText, PAYMENT_METHOD_LABEL, receiptNumber, roundFils } from "@/lib/money";
import {
  Banknote, CreditCard, Smartphone, Mail, MessageCircle, Star, Loader2, Check, ChevronDown, ListChecks,
  Plus, Trash2, Wallet, ReceiptText, ExternalLink, Sparkles, Send, AlertCircle, RotateCcw, CircleCheckBig,
} from "lucide-react";

type PaymentMethod = "cash" | "card" | "benefit";
type ReviewMode = "later" | "now" | "off";

type BookingItem = { id: string; booking_id: string; business_id: string; description: string; qty: number; unit_price: number; created_at?: string };
type BookingPayment = { id: string; type: "deposit" | "balance" | "full" | "refund"; method: PaymentMethod | null; amount: number; created_at?: string };

type Links = {
  paid: boolean;
  receiptUrl: string | null;
  receiptSentAt: string | null;
  reviewRequestedAt: string | null;
  hasReview: boolean;
  canRequestReview: boolean;
  whatsapp: { receipt: string; review: string | null } | null;
};

const METHODS: { key: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { key: "cash", label: "Cash", icon: Banknote },
  { key: "card", label: "Card", icon: CreditCard },
  { key: "benefit", label: "BenefitPay", icon: Smartphone },
];

const PREFS_KEY = "luupa:checkoutPrefs";

const cardCls = "rounded-2xl bg-white border border-stone-line p-4";
const sectionTitle = "flex items-center gap-1.5 text-sm font-semibold text-ink";

// The Payment tab used to be four separate cards (items, discount, a
// "send invoice" grid of 6 near-identical buttons, a payment ledger) with no
// clear "this is how you get paid" path — and nothing stopped a booking
// being marked done unpaid. It's now a checkout:
//
//   1. Amount due (suggested from line items / the service's listed price)
//   2. How they paid — one tap
//   3. One button: take payment → booking paid + completed → receipt emailed
//      + WhatsApp opened automatically → review request queued for later
//
// Itemizing, discounts and deposits are still here, folded away until
// needed. Completion without payment is blocked in the database itself
// (migration v29), so this is the only way a booking reaches "completed".
export default function BookingDrawerPaymentTab({
  booking,
  business,
  businessId,
  onUpdate,
  onPatched,
}: {
  booking: any;
  business: any;
  businessId: string;
  onUpdate: (id: string, changes: Record<string, any>) => void | Promise<void>;
  onPatched: (row: any) => void;
}) {
  const bk = booking;
  const [items, setItems] = useState<BookingItem[]>([]);
  const [payments, setPayments] = useState<BookingPayment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);

  const [discountStr, setDiscountStr] = useState(bk.discount_amount ? String(bk.discount_amount) : "");
  const [discountNote, setDiscountNote] = useState(bk.discount_note || "");
  const [showItemize, setShowItemize] = useState(false);
  const [showLedger, setShowLedger] = useState(false);

  const [totalStr, setTotalStr] = useState(bk.amount != null ? String(bk.amount) : "");
  const [totalTouched, setTotalTouched] = useState(bk.amount != null);
  const [method, setMethod] = useState<PaymentMethod | "">((bk.payment_method as PaymentMethod) || "");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [review, setReview] = useState<ReviewMode>("later");
  const [complete, setComplete] = useState(bk.status !== "confirmed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  // Remember the owner's delivery preferences between bookings.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      if (typeof saved.sendEmail === "boolean") setSendEmail(saved.sendEmail);
      if (typeof saved.sendWhatsApp === "boolean") setSendWhatsApp(saved.sendWhatsApp);
      if (saved.review === "later" || saved.review === "now" || saved.review === "off") setReview(saved.review);
    } catch {
      // ignore
    }
  }, []);
  function savePrefs(next: { sendEmail?: boolean; sendWhatsApp?: boolean; review?: ReviewMode }) {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      localStorage.setItem(PREFS_KEY, JSON.stringify({ ...saved, ...next }));
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from("booking_items").select("*").eq("booking_id", bk.id).order("created_at"),
      supabase.from("booking_payments").select("*").eq("booking_id", bk.id).order("created_at"),
    ]).then(([itemsRes, paymentsRes]) => {
      if (cancelled) return;
      setLoadError(!!(itemsRes.error || paymentsRes.error));
      const its = (itemsRes.data || []) as BookingItem[];
      setItems(its);
      setPayments((paymentsRes.data || []) as BookingPayment[]);
      if (its.length > 0 || Number(bk.discount_amount) > 0) setShowItemize(true);
      setLoaded(true);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bk.id]);

  // --- Totals ---------------------------------------------------------------
  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unit_price) || 0), 0);
  const discount = parseAmount(discountStr) ?? 0;
  const servicePrice = useMemo(() => {
    const services = (business?.services as { name: string; price?: string }[] | null) || [];
    const match = services.find((s) => s.name === bk.service);
    return priceFromText(match?.price);
  }, [business?.services, bk.service]);
  const suggested =
    items.length > 0 ? roundFils(Math.max(0, subtotal - discount)) : servicePrice != null ? roundFils(Math.max(0, servicePrice - discount)) : null;
  const suggestedSource = items.length > 0 ? "line items" : servicePrice != null ? `${bk.service} price` : null;

  // Until the owner types their own figure, the amount follows the
  // suggestion live (add an item → total updates).
  useEffect(() => {
    if (!totalTouched && suggested != null) setTotalStr(suggested.toFixed(3));
  }, [suggested, totalTouched]);

  const total = parseAmount(totalStr);
  const paidSoFar = payments.reduce((s, p) => s + (p.type === "refund" ? -1 : 1) * (Number(p.amount) || 0), 0);
  const balance = total != null ? roundFils(total - paidSoFar) : null;
  const hasEmail = !!bk.customer_email;
  const hasPhone = !!bk.customer_contact;
  const canCheckout = !bk.paid && ["confirmed", "arrived", "in_progress", "completed"].includes(bk.status);

  // --- Line items -----------------------------------------------------------
  function updateItemField(id: string, field: "description" | "qty" | "unit_price", value: any) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  }
  async function saveItem(id: string) {
    const row = items.find((it) => it.id === id);
    if (!row) return;
    const { error: err } = await supabase.from("booking_items").update({ description: row.description, qty: row.qty, unit_price: row.unit_price }).eq("id", id);
    if (err) {
      setItemsError("Couldn't save that item — try again.");
      const { data: fresh } = await supabase.from("booking_items").select("*").eq("id", id).single();
      if (fresh) setItems((prev) => prev.map((it) => (it.id === id ? fresh : it)));
    }
  }
  async function addItem(prefill?: { description: string; unit_price: number }) {
    setItemsError(null);
    const { data, error: err } = await supabase
      .from("booking_items")
      .insert({ booking_id: bk.id, business_id: businessId, description: prefill?.description ?? "", qty: 1, unit_price: prefill?.unit_price ?? 0 })
      .select()
      .single();
    if (err || !data) {
      setItemsError("Couldn't add that item — try again.");
      return;
    }
    setItems((prev) => [...prev, data]);
  }
  async function removeItem(id: string) {
    const previous = items;
    setItems((prev) => prev.filter((it) => it.id !== id));
    const { error: err } = await supabase.from("booking_items").delete().eq("id", id);
    if (err) {
      setItems(previous);
      setItemsError("Couldn't remove that item — try again.");
    }
  }
  function commitDiscount() {
    const value = parseAmount(discountStr) ?? 0;
    if (value !== (Number(bk.discount_amount) || 0)) onUpdate(bk.id, { discount_amount: value });
  }
  function commitDiscountNote() {
    const value = discountNote.trim() || null;
    if (value !== (bk.discount_note || null)) onUpdate(bk.id, { discount_note: value });
  }

  // --- Checkout ---------------------------------------------------------------
  async function checkout() {
    setError(null);
    if (total == null) return setError("Enter the amount the customer is paying.");
    if (!method) return setError("Choose how they paid.");

    // Opened synchronously inside the click so popup blockers allow it; we
    // point it at the WhatsApp chat once the payment is saved, or close it
    // if anything fails. (Skipped entirely if WhatsApp isn't wanted.)
    let waWin: Window | null = null;
    if (sendWhatsApp && hasPhone) {
      waWin = window.open("", "_blank");
      if (waWin) {
        waWin.opener = null;
        waWin.document.title = "Preparing receipt…";
        waWin.document.body.innerHTML =
          '<div style="font-family:system-ui,sans-serif;display:flex;height:100vh;align-items:center;justify-content:center;color:#0F3D2E;font-size:16px">Preparing the WhatsApp receipt…</div>';
      }
    }

    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    let result: any = null;
    try {
      const res = await fetch("/api/bookings/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({
          bookingId: bk.id,
          total,
          method,
          complete,
          emailReceipt: sendEmail,
          review: hasEmail && complete ? review : "off",
        }),
      });
      result = await res.json().catch(() => null);
      if (!res.ok || !result?.booking) {
        waWin?.close();
        setError(result?.error || "Couldn't take that payment — nothing was charged or saved. Try again.");
        setBusy(false);
        return;
      }
    } catch {
      waWin?.close();
      setError("Connection problem — check your internet and try again.");
      setBusy(false);
      return;
    }

    if (waWin) {
      if (result.whatsapp?.status === "sent" || !result.whatsapp?.links?.receipt) waWin.close();
      else waWin.location.href = result.whatsapp.links.receipt;
    }
    setLastResult({ ...result, whatsappOpened: !!waWin && result.whatsapp?.status !== "sent", popupBlocked: sendWhatsApp && hasPhone && !waWin });
    onPatched(result.booking);
    setBusy(false);
  }

  if (bk.paid) {
    return <PaidPanel booking={bk} items={items} payments={payments} lastResult={lastResult} onPatched={onPatched} onUpdate={onUpdate} />;
  }

  return (
    <>
      {/* ---------- Checkout ---------- */}
      <div className="rounded-2xl overflow-hidden border border-navy/20 shadow-sm">
        <div className="relative bg-gradient-to-br from-navy to-navy-dim px-5 pt-4 pb-5 text-white overflow-hidden">
          <div className="absolute -top-10 -right-8 w-36 h-36 rounded-full bg-teal/25 blur-2xl pointer-events-none" />
          <p className="relative text-[11px] uppercase tracking-wider text-white/55 font-semibold flex items-center gap-1.5">
            <ReceiptText size={12} /> Checkout · {receiptNumber(bk.id)}
          </p>
          <label className="relative mt-2 flex items-baseline gap-2">
            <span className="text-lg font-semibold text-white/60">BHD</span>
            <input
              inputMode="decimal"
              value={totalStr}
              onChange={(e) => { setTotalStr(e.target.value); setTotalTouched(true); }}
              placeholder="0.000"
              aria-label="Amount due (BHD)"
              className="w-full bg-transparent font-display text-4xl font-semibold tracking-tight text-white placeholder:text-white/25 outline-none border-b border-white/15 focus:border-teal-light pb-1 transition-colors"
            />
          </label>
          <div className="relative mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/60">
            {suggested != null && totalTouched && Math.abs((total ?? -1) - suggested) > 0.0005 && (
              <button type="button" onClick={() => { setTotalStr(suggested.toFixed(3)); setTotalTouched(false); }} className="flex items-center gap-1 text-teal-light hover:text-white font-medium">
                <Sparkles size={11} /> Use {formatBhd(suggested)} from {suggestedSource}
              </button>
            )}
            {suggested != null && !totalTouched && <span>Suggested from {suggestedSource}{discount > 0 ? ", minus discount" : ""}</span>}
            {paidSoFar > 0 && balance != null && (
              <span className="text-white/80">
                Deposit {formatBhd(paidSoFar)} · <b className="text-white">Due now {formatBhd(Math.max(0, balance))}</b>
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-stone uppercase tracking-wide mb-2">How did they pay?</p>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMethod(key)}
                  aria-pressed={method === key}
                  className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-150 active:scale-[0.97] ${
                    method === key
                      ? "border-teal bg-teal/[0.06] text-ink shadow-[0_0_0_4px_rgba(5,150,105,0.10)]"
                      : "border-stone-line text-ink/70 hover:border-navy/25 hover:text-ink"
                  }`}
                >
                  <Icon size={18} className={method === key ? "text-teal-dim" : "text-stone"} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {method === "benefit" && business?.payment_qr_url && hasPhone && total != null && (
            <a
              href={`https://wa.me/${normalizeWhatsAppNumber(bk.customer_contact)}?text=${encodeURIComponent(
                `Hi ${String(bk.customer_name || "").split(" ")[0]}, your total at ${business.name} is ${formatBhd(paidSoFar > 0 && balance != null ? Math.max(0, balance) : total)}.\nPay with BenefitPay using our QR: ${business.payment_qr_url}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="-mt-2 flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-navy-light"
            >
              <Smartphone size={12} /> Customer paying remotely? Send your BenefitPay QR on WhatsApp
            </a>
          )}

          <div>
            <p className="text-xs font-semibold text-stone uppercase tracking-wide mb-2">Send automatically</p>
            <div className="flex flex-wrap gap-2">
              <Toggle
                on={sendEmail && hasEmail}
                disabled={!hasEmail}
                onClick={() => { setSendEmail(!sendEmail); savePrefs({ sendEmail: !sendEmail }); }}
                icon={<Mail size={13} />}
                label="Email receipt"
                hint={hasEmail ? bk.customer_email : "No email on file"}
              />
              <Toggle
                on={sendWhatsApp && hasPhone}
                disabled={!hasPhone}
                onClick={() => { setSendWhatsApp(!sendWhatsApp); savePrefs({ sendWhatsApp: !sendWhatsApp }); }}
                icon={<MessageCircle size={13} />}
                label="WhatsApp receipt"
                hint={hasPhone ? bk.customer_contact : "No number on file"}
              />
              <Toggle
                on={review !== "off" && hasEmail && complete}
                disabled={!hasEmail || !complete}
                onClick={() => { const next = review === "off" ? "later" : "off"; setReview(next); savePrefs({ review: next }); }}
                icon={<Star size={13} />}
                label="Ask for a review"
                hint={!hasEmail ? "Needs an email" : !complete ? "After completion" : review === "now" ? "Right away" : "2 hours later"}
              />
            </div>
            {review !== "off" && hasEmail && complete && (
              <div className="mt-2 flex items-center gap-1 text-[11px] text-stone">
                Review email goes out
                <button type="button" onClick={() => { setReview("later"); savePrefs({ review: "later" }); }} className={`px-1.5 py-0.5 rounded-md ${review === "later" ? "bg-navy text-white" : "hover:bg-canvas2"}`}>2h later</button>
                <button type="button" onClick={() => { setReview("now"); savePrefs({ review: "now" }); }} className={`px-1.5 py-0.5 rounded-md ${review === "now" ? "bg-navy text-white" : "hover:bg-canvas2"}`}>now</button>
              </div>
            )}
            {(!hasEmail || !hasPhone) && (
              <p className="text-[11px] text-stone mt-2">Add the customer's {!hasEmail && !hasPhone ? "email or number" : !hasEmail ? "email" : "number"} in the Details tab to send it there too.</p>
            )}
          </div>

          {bk.status !== "completed" && (
            <label className="flex items-center justify-between gap-3 rounded-xl bg-canvas2 px-3.5 py-2.5 cursor-pointer">
              <span className="text-sm text-ink">
                Mark booking completed
                <span className="block text-[11px] text-stone">{bk.status === "confirmed" ? "Turn off if they're paying before the service" : "Payment done = job done"}</span>
              </span>
              <input type="checkbox" checked={complete} onChange={(e) => setComplete(e.target.checked)} className="w-5 h-5 accent-teal" />
            </label>
          )}

          {error && (
            <p className="flex items-start gap-1.5 text-sm text-red-600"><AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}</p>
          )}

          {canCheckout ? (
            <button
              type="button"
              onClick={checkout}
              disabled={busy || !loaded}
              className="w-full h-14 rounded-2xl bg-teal text-white font-semibold text-[15px] flex items-center justify-center gap-2 shadow-[0_10px_30px_-10px_rgba(5,150,105,0.7)] hover:bg-teal-dim hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {busy ? (
                <><Loader2 size={18} className="animate-spin" /> Taking payment…</>
              ) : (
                <>
                  <CircleCheckBig size={18} />
                  {total != null ? `Take ${formatBhd(paidSoFar > 0 && balance != null ? Math.max(0, balance) : total)}` : "Take payment"}
                  {complete && bk.status !== "completed" ? " & complete" : ""}
                </>
              )}
            </button>
          ) : (
            <p className="text-sm text-stone text-center bg-canvas2 rounded-xl py-3 px-4">
              {bk.status === "pending" ? "Confirm this booking first — then you can take payment here." : "This booking isn't active, so there's nothing to charge."}
            </p>
          )}
          {loadError && <p className="text-xs text-red-600">Couldn't load existing items/payments — refresh before charging.</p>}
        </div>
      </div>

      {/* ---------- Itemize & discount (optional) ---------- */}
      <div className={cardCls}>
        <button type="button" onClick={() => setShowItemize((s) => !s)} className="w-full flex items-center justify-between">
          <span className={sectionTitle}><ListChecks size={14} /> Itemize & discount</span>
          <span className="flex items-center gap-2 text-xs text-stone">
            {items.length > 0 && `${items.length} item${items.length === 1 ? "" : "s"}`}
            {discount > 0 && ` · −${formatBhd(discount)}`}
            <ChevronDown size={15} className={`transition-transform ${showItemize ? "rotate-180" : ""}`} />
          </span>
        </button>
        {showItemize && (
          <div className="mt-3 space-y-3 fade-up" style={{ animationDuration: "0.2s" }}>
            {items.length > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_44px_72px_24px] gap-1.5 text-[10px] uppercase tracking-wide text-stone font-semibold px-0.5">
                  <span>Item</span><span>Qty</span><span>Price</span><span />
                </div>
                {items.map((row) => (
                  <div key={row.id} className="grid grid-cols-[1fr_44px_72px_24px] gap-1.5 items-center">
                    <input value={row.description} onChange={(e) => updateItemField(row.id, "description", e.target.value)} onBlur={() => saveItem(row.id)} placeholder="Item" className="input text-sm py-1.5 px-2" />
                    <input type="number" min={1} value={row.qty} onChange={(e) => updateItemField(row.id, "qty", Math.max(1, Number(e.target.value) || 1))} onBlur={() => saveItem(row.id)} className="input text-sm py-1.5 px-1.5 text-center" />
                    <input type="number" step="0.001" min="0" value={row.unit_price} onChange={(e) => updateItemField(row.id, "unit_price", Number(e.target.value) || 0)} onBlur={() => saveItem(row.id)} className="input text-sm py-1.5 px-1.5 text-right" />
                    <button type="button" onClick={() => removeItem(row.id)} aria-label="Remove item" className="text-stone hover:text-red-600 transition-colors flex justify-center">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <p className="text-right text-sm font-semibold text-ink">Subtotal {formatBhd(subtotal)}</p>
              </div>
            )}
            {itemsError && <p className="text-xs text-red-600">{itemsError}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => addItem()} className="flex items-center gap-1 text-xs font-semibold text-teal-dim hover:text-teal px-2.5 py-1.5 rounded-lg bg-teal/5">
                <Plus size={13} /> Add item
              </button>
              {/* One-tap: add the business's own listed services as items. */}
              {((business?.services as { name: string; price?: string }[] | null) || []).slice(0, 6).map((s) => {
                const price = priceFromText(s.price);
                if (price == null) return null;
                return (
                  <button key={s.name} type="button" onClick={() => addItem({ description: s.name, unit_price: price })} className="text-xs font-medium text-ink/70 hover:text-ink px-2.5 py-1.5 rounded-lg border border-stone-line hover:border-navy/25">
                    + {s.name} <span className="text-stone">{formatBhd(price)}</span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-[110px_1fr] gap-2 pt-1">
              <input inputMode="decimal" placeholder="Discount" value={discountStr} onChange={(e) => setDiscountStr(e.target.value)} onBlur={commitDiscount} className="input text-sm" aria-label="Discount (BHD)" />
              <input placeholder="Reason (optional)" value={discountNote} onChange={(e) => setDiscountNote(e.target.value)} onBlur={commitDiscountNote} maxLength={120} className="input text-sm" />
            </div>
          </div>
        )}
      </div>

      {/* ---------- Deposits / ledger ---------- */}
      <Ledger
        open={showLedger}
        onToggle={() => setShowLedger((s) => !s)}
        payments={payments}
        allowDeposit
        bookingId={bk.id}
        businessId={businessId}
        onAdded={(p) => setPayments((prev) => [...prev, p])}
      />
    </>
  );
}

// -----------------------------------------------------------------------------
// After payment: confirmation + receipt delivery status + review request.
// -----------------------------------------------------------------------------
function PaidPanel({
  booking: bk,
  items,
  payments: initialPayments,
  lastResult,
  onPatched,
  onUpdate,
}: {
  booking: any;
  items: BookingItem[];
  payments: BookingPayment[];
  lastResult: any;
  onPatched: (row: any) => void;
  onUpdate: (id: string, changes: Record<string, any>) => void | Promise<void>;
}) {
  const [links, setLinks] = useState<Links | null>(null);
  const [payments, setPayments] = useState(initialPayments);
  const [showLedger, setShowLedger] = useState(false);
  const [emailState, setEmailState] = useState<string | null>(lastResult?.email?.status ?? null);
  const [reviewState, setReviewState] = useState<{ status: string; at?: string } | null>(lastResult?.review ?? null);
  const [busy, setBusy] = useState<"email" | "review" | "complete" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => setPayments(initialPayments), [initialPayments]);

  async function authHeader() {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token ?? ""}`, "Content-Type": "application/json" };
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/bookings/receipt?bookingId=${bk.id}`, { headers: await authHeader() });
      const data = await res.json().catch(() => null);
      if (!cancelled && res.ok && data) setLinks(data);
    })();
    return () => { cancelled = true; };
    // Refetch when the booking flips to completed — that unlocks reviews.
  }, [bk.id, bk.status]);

  async function resendEmail() {
    setBusy("email");
    setActionError(null);
    const res = await fetch("/api/bookings/receipt", { method: "POST", headers: await authHeader(), body: JSON.stringify({ bookingId: bk.id }) });
    const data = await res.json().catch(() => null);
    setEmailState(data?.status ?? "send_failed");
    if (!res.ok && data?.error) setActionError(data.error);
    setBusy(null);
  }

  async function requestReview() {
    setBusy("review");
    setActionError(null);
    const res = await fetch("/api/bookings/review-request", { method: "POST", headers: await authHeader(), body: JSON.stringify({ bookingId: bk.id }) });
    const data = await res.json().catch(() => null);
    setReviewState(data ?? { status: "send_failed" });
    setBusy(null);
  }

  async function markCompleted() {
    setBusy("complete");
    await onUpdate(bk.id, { status: "completed" });
    setBusy(null);
  }

  const paidAt = bk.paid_at ? new Date(bk.paid_at) : null;
  const emailLabel = statusLabel(emailState ?? (links?.receiptSentAt ? "sent" : null), "email");
  const reviewInfo = reviewState ?? (links?.reviewRequestedAt ? { status: new Date(links.reviewRequestedAt) > new Date() ? "scheduled" : "sent", at: links.reviewRequestedAt } : null);
  // The server allows one review email per 12h (and a scheduled one counts)
  // — don't offer a button it would refuse, or that would double-send.
  const lastAskedAt = reviewInfo && ["sent", "scheduled", "too_soon", "already_requested"].includes(reviewInfo.status) ? reviewInfo.at ?? links?.reviewRequestedAt : null;
  const recentlyAsked = !!lastAskedAt && Date.now() - new Date(lastAskedAt).getTime() < 12 * 3600 * 1000;

  return (
    <>
      <div className="rounded-2xl overflow-hidden border border-teal/25 shadow-sm">
        <div className="relative bg-gradient-to-br from-teal-dim to-navy px-5 py-5 text-white overflow-hidden">
          <div className="absolute -top-12 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <span className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center pop-in">
              <Check size={22} strokeWidth={3} />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Paid · {receiptNumber(bk.id)}</p>
              <p className="font-display text-3xl font-semibold leading-tight">{formatBhd(bk.amount)}</p>
            </div>
          </div>
          <p className="relative text-xs text-white/70 mt-2">
            {PAYMENT_METHOD_LABEL[bk.payment_method] || "Paid"}
            {paidAt ? ` · ${paidAt.toLocaleDateString(undefined, { day: "numeric", month: "short" })}, ${paidAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : ""}
            {bk.status === "completed" ? " · Booking completed" : ""}
          </p>
        </div>

        <div className="bg-white divide-y divide-stone-line">
          {bk.status !== "completed" && ["confirmed", "arrived", "in_progress"].includes(bk.status) && (
            <div className="p-4 flex items-center justify-between gap-3">
              <p className="text-sm text-ink">Paid upfront — finish the job, then complete it.</p>
              <button onClick={markCompleted} disabled={busy === "complete"} className="shrink-0 flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-navy text-white hover:bg-navy-light disabled:opacity-60">
                {busy === "complete" ? <Loader2 size={14} className="animate-spin" /> : <CircleCheckBig size={14} />} Complete
              </button>
            </div>
          )}

          <DeliveryRow
            icon={<Mail size={15} />}
            title="Email receipt"
            subtitle={bk.customer_email || "No email on file"}
            status={emailLabel}
            action={bk.customer_email ? { label: emailState === "sent" || links?.receiptSentAt ? "Resend" : "Send", onClick: resendEmail, busy: busy === "email" } : null}
          />
          <DeliveryRow
            icon={<MessageCircle size={15} />}
            title="WhatsApp receipt"
            subtitle={bk.customer_contact || "No number on file"}
            status={
              lastResult?.whatsapp?.status === "sent"
                ? { tone: "ok", text: "Sent" }
                : lastResult?.whatsappOpened
                ? { tone: "ok", text: "Opened in WhatsApp" }
                : lastResult?.popupBlocked
                ? { tone: "warn", text: "Pop-up blocked — tap Open" }
                : null
            }
            href={links?.whatsapp?.receipt}
            hrefLabel="Open"
          />
          <DeliveryRow
            icon={<Star size={15} />}
            title="Review request"
            subtitle={
              links?.hasReview
                ? "They've already left a review"
                : bk.status !== "completed"
                ? "Available once the booking is completed"
                : !bk.customer_email
                ? "Needs an email — or send it on WhatsApp"
                : "Separate email with one-tap star rating"
            }
            status={links?.hasReview ? { tone: "ok", text: "Reviewed ✓" } : reviewInfo ? reviewStatusLabel(reviewInfo) : null}
            action={
              links?.canRequestReview && !links.hasReview && !recentlyAsked
                ? { label: reviewInfo && ["sent", "scheduled"].includes(reviewInfo.status) ? "Send again" : "Send", onClick: requestReview, busy: busy === "review" }
                : null
            }
            href={!links?.hasReview ? links?.whatsapp?.review ?? undefined : undefined}
            hrefLabel="WhatsApp"
          />
          {links?.receiptUrl && (
            <a href={links.receiptUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 p-3 text-sm font-medium text-navy hover:bg-canvas2 transition-colors">
              <ReceiptText size={14} /> View receipt <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
      {actionError && <p className="text-xs text-red-600">{actionError}</p>}

      {items.length > 0 && (
        <div className={cardCls}>
          <p className={`${sectionTitle} mb-2`}><ListChecks size={14} /> Items</p>
          <div className="space-y-1.5 text-sm">
            {items.map((it) => (
              <div key={it.id} className="flex justify-between gap-3">
                <span className="text-ink truncate">{it.description || "Item"} <span className="text-stone">×{it.qty}</span></span>
                <span className="text-ink font-medium shrink-0">{formatBhd((Number(it.qty) || 0) * (Number(it.unit_price) || 0))}</span>
              </div>
            ))}
            {Number(bk.discount_amount) > 0 && (
              <div className="flex justify-between gap-3 text-stone">
                <span>Discount{bk.discount_note ? ` (${bk.discount_note})` : ""}</span>
                <span>−{formatBhd(bk.discount_amount)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <Ledger
        open={showLedger}
        onToggle={() => setShowLedger((s) => !s)}
        payments={payments}
        allowDeposit={false}
        bookingId={bk.id}
        businessId={bk.business_id}
        onAdded={(p) => setPayments((prev) => [...prev, p])}
      />
    </>
  );
}

type Status = { tone: "ok" | "warn" | "muted"; text: string } | null;

function statusLabel(state: string | null, _kind: "email"): Status {
  if (!state) return null;
  if (state === "sent") return { tone: "ok", text: "Sent" };
  if (state === "skipped") return { tone: "muted", text: "Not sent" };
  if (state === "no_email") return null;
  if (state === "too_soon") return { tone: "muted", text: "Just sent" };
  if (state === "not_configured") return { tone: "warn", text: "Email not set up" };
  return { tone: "warn", text: "Didn't send — retry" };
}

function reviewStatusLabel(r: { status: string; at?: string }): Status {
  const time = r.at ? new Date(r.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
  if (r.status === "scheduled") return { tone: "ok", text: `Scheduled${time ? ` · ${time}` : ""}` };
  if (r.status === "sent") return { tone: "ok", text: "Sent" };
  if (r.status === "too_soon" || r.status === "already_requested") return { tone: "muted", text: "Already asked" };
  if (r.status === "already_reviewed") return { tone: "ok", text: "Reviewed ✓" };
  if (r.status === "skipped") return null;
  if (r.status === "not_configured") return { tone: "warn", text: "Email not set up" };
  if (r.status === "not_completed") return { tone: "muted", text: "After completion" };
  return { tone: "warn", text: "Didn't send — retry" };
}

function DeliveryRow({
  icon,
  title,
  subtitle,
  status,
  action,
  href,
  hrefLabel,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  status: Status;
  action?: { label: string; onClick: () => void; busy: boolean } | null;
  href?: string;
  hrefLabel?: string;
}) {
  const tone = status?.tone === "ok" ? "bg-teal/10 text-teal-dim" : status?.tone === "warn" ? "bg-red-50 text-red-600" : "bg-canvas2 text-stone";
  return (
    <div className="p-4 flex items-center gap-3">
      <span className="w-9 h-9 rounded-xl bg-canvas2 text-navy flex items-center justify-center shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink flex items-center gap-2 flex-wrap">
          {title}
          {status && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tone}`}>{status.text}</span>}
        </p>
        <p className="text-xs text-stone truncate">{subtitle}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {href && (
          <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-stone-line text-ink hover:border-navy/30 transition-colors">
            <MessageCircle size={12} /> {hrefLabel}
          </a>
        )}
        {action && (
          <button onClick={action.onClick} disabled={action.busy} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-navy text-white hover:bg-navy-light disabled:opacity-60 transition-colors">
            {action.busy ? <Loader2 size={12} className="animate-spin" /> : action.label === "Resend" ? <RotateCcw size={12} /> : <Send size={12} />}
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

function Toggle({ on, disabled, onClick, icon, label, hint }: { on: boolean; disabled?: boolean; onClick: () => void; icon: React.ReactNode; label: string; hint: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      title={hint}
      className={`group flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border text-xs font-semibold transition-all disabled:opacity-45 disabled:cursor-not-allowed ${
        on ? "border-teal/40 bg-teal/[0.07] text-ink" : "border-stone-line text-stone hover:text-ink"
      }`}
    >
      <span className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${on ? "bg-teal text-white" : "bg-canvas2 text-stone"}`}>
        {on ? <Check size={11} strokeWidth={3} /> : icon}
      </span>
      <span className="text-left leading-tight">
        {label}
        <span className="block text-[10px] font-normal text-stone max-w-[150px] truncate">{hint}</span>
      </span>
    </button>
  );
}

// Deposits taken before the job, refunds after — the full money trail.
function Ledger({
  open,
  onToggle,
  payments,
  allowDeposit,
  bookingId,
  businessId,
  onAdded,
}: {
  open: boolean;
  onToggle: () => void;
  payments: BookingPayment[];
  allowDeposit: boolean;
  bookingId: string;
  businessId: string;
  onAdded: (p: BookingPayment) => void;
}) {
  const [type, setType] = useState<"deposit" | "refund">(allowDeposit ? "deposit" : "refund");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amountStr, setAmountStr] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const net = payments.reduce((s, p) => s + (p.type === "refund" ? -1 : 1) * (Number(p.amount) || 0), 0);

  async function add() {
    const n = parseAmount(amountStr);
    if (n == null || n <= 0) return setErr("Enter a valid amount.");
    if (type === "refund" && n > net + 0.0005) return setErr(`You can refund at most ${formatBhd(net)}.`);
    setSaving(true);
    setErr(null);
    const { data, error } = await supabase
      .from("booking_payments")
      .insert({ booking_id: bookingId, business_id: businessId, type, method, amount: n })
      .select()
      .single();
    setSaving(false);
    if (error || !data) return setErr("Couldn't record that — try again.");
    onAdded(data as BookingPayment);
    setAmountStr("");
  }

  return (
    <div className={cardCls}>
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between">
        <span className={sectionTitle}><Wallet size={14} /> {allowDeposit ? "Deposits & payments" : "Payments & refunds"}</span>
        <span className="flex items-center gap-2 text-xs text-stone">
          {payments.length > 0 ? `${formatBhd(net)} net` : "None yet"}
          <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="mt-3 space-y-3 fade-up" style={{ animationDuration: "0.2s" }}>
          {payments.length > 0 && (
            <div className="space-y-1.5">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm bg-canvas2 rounded-lg px-3 py-2">
                  <span className="min-w-0 truncate">
                    <span className="font-medium text-ink capitalize">{p.type}</span>
                    {p.method && <span className="text-stone"> · {PAYMENT_METHOD_LABEL[p.method]}</span>}
                    {p.created_at && <span className="text-stone"> · {new Date(p.created_at).toLocaleDateString()}</span>}
                  </span>
                  <span className={`font-semibold shrink-0 ${p.type === "refund" ? "text-red-600" : "text-ink"}`}>
                    {p.type === "refund" ? "−" : ""}{formatBhd(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
            <select value={type} onChange={(e) => setType(e.target.value as any)} className="input text-sm" aria-label="Type">
              {allowDeposit && <option value="deposit">Deposit</option>}
              <option value="refund">Refund</option>
            </select>
            <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="input text-sm" aria-label="Method">
              {METHODS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <input inputMode="decimal" placeholder="Amount" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} className="input text-sm" aria-label="Amount (BHD)" />
          </div>
          {err && <p className="text-xs text-red-600">{err}</p>}
          <button type="button" onClick={add} disabled={saving} className="w-full flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl bg-canvas2 text-ink hover:bg-stone-line/60 transition-colors disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Record {type}
          </button>
        </div>
      )}
    </div>
  );
}
