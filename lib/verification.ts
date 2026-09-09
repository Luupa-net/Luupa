/**
 * A business's verified badge is only real right now if `verified` is true AND
 * either there's no expiry date, or that date hasn't passed yet. This is computed
 * fresh on every read — no scheduled job needed to "remove" an expired badge,
 * it just naturally stops counting as verified the moment the date passes.
 */
export function isEffectivelyVerified(business: { verified?: boolean; verified_until?: string | null }): boolean {
  if (!business.verified) return false;
  if (!business.verified_until) return true; // verified with no expiry set
  return new Date(business.verified_until) > new Date();
}

export const VERIFICATION_DURATIONS = [
  { label: "1 month", months: 1 },
  { label: "3 months", months: 3 },
  { label: "6 months", months: 6 },
  { label: "12 months", months: 12 },
];

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
