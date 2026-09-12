// Fields that affect what a customer actually sees on a live listing. Anything
// in a business's `pending_changes` draft that ISN'T in this list is ignored
// when an admin approves — a business could otherwise stuff extra keys (like
// `verified` or `status`) into their own pending_changes and have them
// silently merged in the moment an admin clicks Approve.
export const PUBLIC_FIELDS = [
  "name", "logo_url", "subcategories", "areas", "phone", "whatsapp",
  "hours", "description", "services", "photos", "is_mobile",
] as const;
