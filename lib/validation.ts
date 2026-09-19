/**
 * Not full verification (no SMS sent) — just catches obvious mistakes before
 * a business submits: wrong digit count, missing country code on WhatsApp, etc.
 * Real verification would need a paid SMS provider; given every business is
 * already personally reviewed before approval, this lighter check covers the
 * common case (typos) without that cost or setup.
 */
export function isValidBahrainPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 8; // Bahrain local numbers are 8 digits
}

export function isValidWhatsAppNumber(whatsapp: string): boolean {
  const digits = whatsapp.replace(/\D/g, "");
  // Expecting country code + number, e.g. 973XXXXXXXX (11 digits) — allow a
  // reasonable range since businesses may occasionally list a non-Bahrain number
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * FIX: customers typing a booking/quote request almost always just type their
 * local 8-digit number (e.g. "32011432"), with no country code. WhatsApp's
 * wa.me links require the full international number to actually open a real
 * chat — without it, the link silently fails instead of erroring loudly, which
 * is exactly why "Send invoice" looked like it worked but nothing arrived.
 * This adds Bahrain's country code automatically when it's missing.
 */
export function normalizeWhatsAppNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 8) return `973${digits}`; // bare local number
  return digits; // already has a country code (or something unusual) — leave it
}

/**
 * SECURITY: a `?next=` query param controls where login/signup redirect
 * after success. Without this check, someone could craft a link like
 * `/account/login?next=https://evil.com` and, after a real Luupa login,
 * silently bounce the customer to an attacker's site (open redirect) — a
 * classic phishing setup.
 *
 * A plain `startsWith("/") && !startsWith("//")` string check is NOT enough:
 * Next.js's router resolves `next` with `new URL(next, location.href)`
 * before deciding whether a navigation is external, and the WHATWG URL
 * parser normalizes backslashes to forward slashes for http(s) — so
 * `/\evil.com` looks same-site as a string but resolves to the
 * protocol-relative `//evil.com`, a different origin, and Next.js will
 * genuinely `location.assign()` the browser there. Resolving `next` through
 * the same URL parser here (against an arbitrary fixed base) and checking
 * the resulting origin closes that off, instead of trying to blocklist
 * individual characters.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return "/";
  const base = "http://luupa.invalid";
  try {
    const resolved = new URL(next, base);
    if (resolved.origin !== base) return "/";
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return "/";
  }
}
