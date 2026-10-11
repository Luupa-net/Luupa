import { NextRequest, NextResponse } from "next/server";
import { readJson, siteUrl } from "@/lib/serverAuth";
import { authorizeOwnerBooking } from "@/lib/ownerBooking";
import { canRequestReview, emailReceipt, receiptUrlFor, whatsappLinks } from "@/lib/bookingDispatch";

// GET  → receipt link, WhatsApp share links and delivery status for a paid
//        booking (powers the "Paid" panel in the booking drawer).
// POST → (re)send the receipt email.
export async function GET(req: NextRequest) {
  const gate = await authorizeOwnerBooking(req, req.nextUrl.searchParams.get("bookingId"));
  if ("error" in gate) return gate.error;
  const r = gate.receipt;
  const base = siteUrl(req);
  return NextResponse.json({
    paid: r.paid,
    receiptUrl: r.paid ? receiptUrlFor(base, r.bookingId) : null,
    receiptSentAt: r.receiptSentAt,
    reviewRequestedAt: r.reviewRequestedAt,
    hasReview: r.hasReview,
    canRequestReview: canRequestReview(r).ok && !!r.customerEmail,
    whatsapp: r.paid ? whatsappLinks(r, base) : null,
  });
}

export async function POST(req: NextRequest) {
  const body = await readJson<{ bookingId?: unknown }>(req);
  const gate = await authorizeOwnerBooking(req, body?.bookingId);
  if ("error" in gate) return gate.error;
  const r = gate.receipt;
  if (!r.paid) return NextResponse.json({ error: "Take payment first — receipts are for paid bookings." }, { status: 400 });
  // Light flood guard: one receipt email per booking per minute.
  if (r.receiptSentAt && Date.now() - new Date(r.receiptSentAt).getTime() < 60_000) {
    return NextResponse.json({ status: "too_soon", at: r.receiptSentAt }, { status: 429 });
  }
  return NextResponse.json(await emailReceipt(r, siteUrl(req)));
}
