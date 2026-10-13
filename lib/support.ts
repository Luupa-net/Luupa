// Luupa's own contact details, in one place — every page, email and link
// reads from here, so changing the address is a one-line edit.
// Switch SUPPORT_EMAIL to hello@luupa.net once luupa.net is registered and
// its email forwarding is confirmed working (send a test from another
// account first) — until then mail to that address goes nowhere.
export const SUPPORT_EMAIL = "luupa.net@gmail.com";

// Luupa's own support WhatsApp (digits with country code, e.g. 9733xxxxxxx).
// Optional: anything that offers it falls back to the contact form when unset.
export const SUPPORT_WHATSAPP = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "").replace(/\D/g, "");

export function supportWhatsAppHref(text: string): string | null {
  return SUPPORT_WHATSAPP ? `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}` : null;
}

// Contact form topics — shared by the /contact page and /api/contact, which
// only accepts these keys. The label is what gets stored and emailed.
export const CONTACT_TOPICS = [
  { key: "booking", label: "Help with a booking" },
  { key: "listing", label: "Listing my business" },
  { key: "verification", label: "Getting verified" },
  { key: "problem", label: "Report a problem" },
  { key: "partnership", label: "Partnership or press" },
  { key: "other", label: "Something else" },
] as const;
export type ContactTopicKey = (typeof CONTACT_TOPICS)[number]["key"];

export const CONTACT_ROLES = [
  { key: "driver", label: "Driver" },
  { key: "business", label: "Business owner" },
  { key: "other", label: "Other" },
] as const;
