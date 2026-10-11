// Bahraini dinar is a 3-decimal currency (1 BHD = 1000 fils), so receipts
// and totals show three places — "BHD 12.500", not "BHD 12.5".
export function formatBhd(value: number | string | null | undefined): string {
  const n = Number(value);
  return `BHD ${(Number.isFinite(n) ? n : 0).toFixed(3)}`;
}

export function roundFils(value: number): number {
  return Math.round(value * 1000) / 1000;
}

// Parses what someone typed into an amount box ("12", "12.5", " 12.500 ").
// Returns null for empty/invalid/negative input rather than guessing.
export function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return roundFils(n);
}

// A business's service list stores price as free text ("25", "BHD 25",
// "from 15"). Pull the first number out, if there is one, to suggest a total.
export function priceFromText(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = /(\d+(?:\.\d+)?)/.exec(String(text));
  return m ? roundFils(Number(m[1])) : null;
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  benefit: "BenefitPay",
};

export function receiptNumber(bookingId: string): string {
  return `LP-${bookingId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}
