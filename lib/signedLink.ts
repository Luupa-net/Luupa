import { createHmac, timingSafeEqual } from "crypto";

// Unguessable, tamper-proof tokens for links we email/WhatsApp to customers
// (view your receipt, leave a review). The token is an HMAC of
// "<purpose>:<bookingId>" with a server-only secret — holding the link
// proves you received that message, without us storing anything. Purpose is
// part of the MAC, so a receipt token can never be replayed as a review
// token or vice versa.
//
// LINK_SIGNING_SECRET is preferred; ADMIN_SESSION_SECRET is an acceptable
// fallback (domain-separated by the "luupa-link:" prefix below).
type Purpose = "receipt" | "review";

function secret(): string {
  const s = process.env.LINK_SIGNING_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("LINK_SIGNING_SECRET (or ADMIN_SESSION_SECRET) must be set");
  return s;
}

export function signBookingLink(purpose: Purpose, bookingId: string): string {
  return createHmac("sha256", secret())
    .update(`luupa-link:${purpose}:${bookingId}`)
    .digest("base64url")
    .slice(0, 32);
}

export function verifyBookingLink(purpose: Purpose, bookingId: string, token: string | null | undefined): boolean {
  if (!token || typeof token !== "string" || token.length !== 32) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(signBookingLink(purpose, bookingId));
  return a.length === b.length && timingSafeEqual(a, b);
}
