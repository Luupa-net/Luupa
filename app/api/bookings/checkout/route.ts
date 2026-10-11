import { NextRequest, NextResponse } from "next/server";
import { getRequestUser, isUuid, readJson, siteUrl, userScopedClient } from "@/lib/serverAuth";
import { loadReceipt } from "@/lib/receipt";
import { emailReceipt, emailReviewRequest, receiptUrlFor, REVIEW_DELAY_MINUTES, whatsappLinks } from "@/lib/bookingDispatch";
import { sendWhatsAppReceipt } from "@/lib/whatsapp";

// One tap at the counter: take payment → booking is paid (and completed) →
// receipt goes out by email (and WhatsApp, when the Cloud API is set up)
// → review request is queued as its own email a little later.
//
// The money part runs as the CALLER through checkout_booking() (migration
// v29), so ownership, "can't complete unpaid", and the payment ledger are all
// enforced inside one database transaction — not by this route.
export async function POST(req: NextRequest) {
  const auth = await getRequestUser(req);
  if (!auth) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await readJson<{
    bookingId?: unknown;
    total?: unknown;
    method?: unknown;
    complete?: unknown;
    emailReceipt?: unknown;
    review?: unknown;
  }>(req);
  if (!body || !isUuid(body.bookingId)) return NextResponse.json({ error: "Invalid booking." }, { status: 400 });

  const total = Number(body.total);
  if (!Number.isFinite(total) || total < 0 || total > 1_000_000) {
    return NextResponse.json({ error: "Enter a valid total." }, { status: 400 });
  }
  const method = typeof body.method === "string" ? body.method : "";
  if (!["cash", "card", "benefit"].includes(method)) {
    return NextResponse.json({ error: "Choose how the customer paid." }, { status: 400 });
  }
  const review = body.review === "now" || body.review === "off" ? body.review : "later";

  const { data: row, error } = await userScopedClient(auth.token).rpc("checkout_booking", {
    p_booking_id: body.bookingId,
    p_total: total,
    p_method: method,
    p_complete: body.complete !== false,
  });
  if (error || !row) {
    const message = (error?.message || "Couldn't take that payment.").replace(/^(CHECKOUT|PAYMENT_REQUIRED|PAYMENT_LOCKED):\s*/, "");
    const status = error?.code === "42501" ? 403 : error?.code === "P0002" ? 404 : 400;
    return NextResponse.json({ error: message.charAt(0).toUpperCase() + message.slice(1) }, { status });
  }

  // Payment is committed from here on — everything below is best-effort
  // delivery, reported back so the UI can offer a retry, never a rollback.
  const receipt = await loadReceipt(body.bookingId);
  if (!receipt || receipt.ownerId !== auth.user.id) {
    return NextResponse.json({ booking: row, email: { status: "send_failed" }, review: { status: "send_failed" } });
  }
  const base = siteUrl(req);

  const [email, whatsappApi, reviewResult] = await Promise.all([
    body.emailReceipt === false ? Promise.resolve({ status: "skipped" as string }) : emailReceipt(receipt, base),
    sendWhatsAppReceipt(receipt, receiptUrlFor(base, receipt.bookingId)),
    review === "off"
      ? Promise.resolve({ status: "skipped" as string })
      : emailReviewRequest(receipt, base, { delayMinutes: review === "now" ? 0 : REVIEW_DELAY_MINUTES, allowResend: false }),
  ]);

  return NextResponse.json({
    booking: row,
    receiptUrl: receiptUrlFor(base, receipt.bookingId),
    email,
    whatsapp: { status: whatsappApi.sent ? "sent" : whatsappApi.reason, links: whatsappLinks(receipt, base) },
    review: reviewResult,
  });
}
