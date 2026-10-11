import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formatBhd, PAYMENT_METHOD_LABEL, receiptNumber } from "@/lib/money";

// Everything a receipt needs, read server-side with the service role from
// the database — never from client-supplied values (the old invoice route
// took `amount`/`vehicle` straight from the request body, so whatever the
// browser sent is what the customer received). Callers MUST authorize the
// request before calling this (owner check, or a verified signed link).

export type ReceiptData = {
  bookingId: string;
  number: string;
  businessId: string;
  businessName: string;
  businessLogo: string | null;
  businessPhone: string | null;
  businessWhatsapp: string | null;
  ownerId: string | null;
  customerId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerContact: string | null;
  service: string | null;
  vehicle: string | null;
  status: string;
  paid: boolean;
  paidAt: string | null;
  method: string | null;
  methodLabel: string | null;
  items: { description: string; qty: number; unitPrice: number; total: number }[];
  subtotal: number | null;
  discount: number;
  discountNote: string | null;
  total: number;
  payments: { type: string; method: string | null; amount: number; at: string }[];
  receiptSentAt: string | null;
  reviewRequestedAt: string | null;
  hasReview: boolean;
};

export async function loadReceipt(bookingId: string): Promise<ReceiptData | null> {
  const [{ data: b, error }, { data: items }, { data: payments }, { data: review }] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select(
        "id, business_id, customer_id, customer_name, customer_email, customer_contact, service, vehicle_make, vehicle_model, vehicle_plate, status, paid, paid_at, payment_method, amount, discount_amount, discount_note, receipt_sent_at, review_requested_at, businesses(name, logo_url, phone, whatsapp, owner_id)"
      )
      .eq("id", bookingId)
      .maybeSingle(),
    supabaseAdmin.from("booking_items").select("description, qty, unit_price").eq("booking_id", bookingId).order("created_at"),
    supabaseAdmin.from("booking_payments").select("type, method, amount, created_at").eq("booking_id", bookingId).order("created_at"),
    supabaseAdmin.from("reviews").select("id").eq("booking_id", bookingId).maybeSingle(),
  ]);
  if (error || !b) return null;

  const biz: any = Array.isArray(b.businesses) ? b.businesses[0] : b.businesses;
  const lineItems = (items ?? []).map((it: any) => {
    const qty = Number(it.qty) || 0;
    const unitPrice = Number(it.unit_price) || 0;
    return { description: it.description || "Item", qty, unitPrice, total: qty * unitPrice };
  });
  const subtotal = lineItems.length > 0 ? lineItems.reduce((s, it) => s + it.total, 0) : null;
  const vehicle = [b.vehicle_make, b.vehicle_model].filter(Boolean).join(" ") + (b.vehicle_plate ? ` (${b.vehicle_plate})` : "");

  return {
    bookingId: b.id,
    number: receiptNumber(b.id),
    businessId: b.business_id,
    businessName: biz?.name || "Your service provider",
    businessLogo: biz?.logo_url ?? null,
    businessPhone: biz?.phone ?? null,
    businessWhatsapp: biz?.whatsapp ?? null,
    ownerId: biz?.owner_id ?? null,
    customerId: b.customer_id,
    customerName: b.customer_name || "there",
    customerEmail: b.customer_email,
    customerContact: b.customer_contact,
    service: b.service,
    vehicle: vehicle.trim() || null,
    status: b.status,
    paid: !!b.paid,
    paidAt: b.paid_at,
    method: b.payment_method,
    methodLabel: b.payment_method ? PAYMENT_METHOD_LABEL[b.payment_method] || b.payment_method : null,
    items: lineItems,
    subtotal,
    discount: Number(b.discount_amount) || 0,
    discountNote: b.discount_note,
    total: Number(b.amount) || 0,
    payments: (payments ?? []).map((p: any) => ({ type: p.type, method: p.method, amount: Number(p.amount) || 0, at: p.created_at })),
    receiptSentAt: b.receipt_sent_at,
    reviewRequestedAt: b.review_requested_at,
    hasReview: !!review,
  };
}

// Plain-text receipt for WhatsApp — WhatsApp renders *bold* and line breaks.
export function receiptWhatsAppText(r: ReceiptData, receiptUrl: string, reviewUrl: string | null): string {
  const lines = [
    `*${r.businessName}* — receipt ${r.number}`,
    `Hi ${r.customerName.split(" ")[0]}, thanks for your visit!`,
    "",
    r.service ? `Service: ${r.service}` : "",
    r.vehicle ? `Vehicle: ${r.vehicle}` : "",
    ...r.items.map((it) => `• ${it.description} ×${it.qty} — ${formatBhd(it.total)}`),
    r.discount > 0 ? `Discount: −${formatBhd(r.discount)}${r.discountNote ? ` (${r.discountNote})` : ""}` : "",
    `*Total paid: ${formatBhd(r.total)}*${r.methodLabel ? ` · ${r.methodLabel}` : ""}`,
    "",
    `Full receipt: ${receiptUrl}`,
    reviewUrl ? `\nEnjoyed it? A quick review helps us a lot ⭐ ${reviewUrl}` : "",
  ];
  return lines.filter((l, i, arr) => l !== "" || (arr[i - 1] ?? "") !== "").join("\n").trim();
}
