import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendReceiptEmail, sendReviewRequestEmail } from "@/lib/email";
import { signBookingLink } from "@/lib/signedLink";
import { normalizeWhatsAppNumber } from "@/lib/validation";
import { receiptWhatsAppText, type ReceiptData } from "@/lib/receipt";

// Server-side side effects of a paid/completed booking. Every caller has
// already authorized the request (owner of this booking) before getting here.

// Review request lands this long after the receipt by default — enough for
// the customer to have driven off and actually seen the result.
export const REVIEW_DELAY_MINUTES = 120;
// A manual "send again" is allowed once the previous request is this old.
const REVIEW_RESEND_AFTER_HOURS = 12;

export function receiptUrlFor(base: string, bookingId: string) {
  return `${base}/receipt/${bookingId}?t=${signBookingLink("receipt", bookingId)}`;
}

export function reviewUrlFor(base: string, bookingId: string) {
  return `${base}/review/${bookingId}?t=${signBookingLink("review", bookingId)}`;
}

export function canRequestReview(r: ReceiptData): { ok: boolean; reason?: string } {
  if (r.status !== "completed") return { ok: false, reason: "not_completed" };
  if (r.hasReview) return { ok: false, reason: "already_reviewed" };
  return { ok: true };
}

export function whatsappLinks(r: ReceiptData, base: string) {
  if (!r.customerContact) return null;
  const number = normalizeWhatsAppNumber(r.customerContact);
  const receiptUrl = receiptUrlFor(base, r.bookingId);
  const reviewUrl = canRequestReview(r).ok ? reviewUrlFor(base, r.bookingId) : null;
  const first = r.customerName.split(" ")[0];
  return {
    receipt: `https://wa.me/${number}?text=${encodeURIComponent(receiptWhatsAppText(r, receiptUrl, reviewUrl))}`,
    review: reviewUrl
      ? `https://wa.me/${number}?text=${encodeURIComponent(
          `Hi ${first}, thanks again for choosing ${r.businessName}! If you have a minute, we'd really appreciate a quick review ⭐\n${reviewUrl}`
        )}`
      : null,
  };
}

export async function emailReceipt(r: ReceiptData, base: string) {
  if (!r.customerEmail) return { status: "no_email" as const };
  const result = await sendReceiptEmail(r.customerEmail, r, receiptUrlFor(base, r.bookingId));
  if (!result.sent) return { status: result.reason };
  const at = new Date().toISOString();
  await supabaseAdmin.from("bookings").update({ receipt_sent_at: at }).eq("id", r.bookingId);
  return { status: "sent" as const, at };
}

// Claims review_requested_at atomically first, so a double click / two tabs
// can't send two review emails; releases the claim if sending fails.
export async function emailReviewRequest(r: ReceiptData, base: string, opts: { delayMinutes: number; allowResend: boolean }) {
  const eligible = canRequestReview(r);
  if (!eligible.ok) return { status: eligible.reason as string };
  if (!r.customerEmail) return { status: "no_email" };

  const now = new Date();
  const previous = r.reviewRequestedAt;
  let claim = supabaseAdmin.from("bookings").update({ review_requested_at: now.toISOString() }).eq("id", r.bookingId);
  if (!previous) {
    claim = claim.is("review_requested_at", null);
  } else {
    if (!opts.allowResend) return { status: "already_requested", at: previous };
    const cutoff = new Date(now.getTime() - REVIEW_RESEND_AFTER_HOURS * 3600 * 1000).toISOString();
    if (previous > cutoff) return { status: "too_soon", at: previous };
    claim = claim.eq("review_requested_at", previous);
  }
  const { data: claimed, error } = await claim.select("id");
  if (error) return { status: "send_failed" };
  if (!claimed || claimed.length === 0) return { status: "already_requested" };

  const scheduledFor = opts.delayMinutes > 0 ? new Date(now.getTime() + opts.delayMinutes * 60 * 1000).toISOString() : undefined;
  const details = { businessName: r.businessName, customerName: r.customerName, service: r.service, reviewUrl: reviewUrlFor(base, r.bookingId) };
  let result = await sendReviewRequestEmail(r.customerEmail, details, { scheduledAt: scheduledFor });
  if (!result.sent && scheduledFor && result.reason === "send_failed") {
    // Scheduling can be refused (plan limits, provider hiccup) — a review
    // request that arrives now still beats one that never arrives.
    result = await sendReviewRequestEmail(r.customerEmail, details);
    if (result.sent) return { status: "sent", at: now.toISOString() };
  }
  if (!result.sent) {
    await supabaseAdmin.from("bookings").update({ review_requested_at: previous ?? null }).eq("id", r.bookingId);
    return { status: result.reason as string };
  }
  return { status: scheduledFor ? "scheduled" : "sent", at: scheduledFor ?? now.toISOString() };
}
