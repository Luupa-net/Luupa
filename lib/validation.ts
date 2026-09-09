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
