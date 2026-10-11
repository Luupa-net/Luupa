import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { verifyBookingLink } from "@/lib/signedLink";
import { loadReceipt } from "@/lib/receipt";
import { isUuid } from "@/lib/serverAuth";
import { formatBhd, PAYMENT_METHOD_LABEL } from "@/lib/money";
import PrintButton from "@/components/PrintButton";
import { CheckCircle2, Phone } from "lucide-react";

// Public-by-link receipt (the "View receipt" button in the receipt email and
// the link in the WhatsApp message). No login needed — possession of the
// signed link is the access check, same idea as a shared invoice link —
// and it's never indexed or cached.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Receipt — Luupa", robots: { index: false, follow: false } };

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { bookingId } = await params;
  const { t } = await searchParams;
  if (!isUuid(bookingId) || !verifyBookingLink("receipt", bookingId, t)) notFound();
  const r = await loadReceipt(bookingId);
  if (!r || !r.paid) notFound();

  const paidOn = r.paidAt
    ? new Date(r.paidAt).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Bahrain" })
    : null;

  return (
    <div className="bg-canvas2 min-h-screen px-4 py-8 sm:py-14 print:bg-white print:p-0">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-3xl border border-stone-line shadow-sm overflow-hidden print:shadow-none print:border-0 fade-up">
          <div className="relative bg-gradient-to-br from-navy to-navy-dim text-white px-6 pt-6 pb-7 overflow-hidden print:bg-none print:text-ink">
            <div className="absolute -top-14 -right-10 w-48 h-48 rounded-full bg-teal/25 blur-3xl pointer-events-none print:hidden" />
            <p className="relative text-[11px] uppercase tracking-[0.18em] text-white/55 print:text-stone">Receipt · {r.number}</p>
            <h1 className="relative font-display text-2xl font-semibold mt-1">{r.businessName}</h1>
            <p className="relative text-sm text-white/60 mt-5 print:text-stone">Total paid</p>
            <p className="relative font-display text-5xl font-semibold tracking-tight">{formatBhd(r.total)}</p>
            <span className="relative inline-flex items-center gap-1.5 mt-3 text-xs font-bold bg-teal/25 text-teal-light px-3 py-1.5 rounded-full print:bg-transparent print:text-teal-dim print:px-0">
              <CheckCircle2 size={13} /> PAID{r.methodLabel ? ` · ${r.methodLabel.toUpperCase()}` : ""}
            </span>
          </div>

          <div className="px-6 py-5 text-sm">
            <p className="text-ink">Billed to <b>{r.customerName}</b></p>
            <dl className="mt-4 divide-y divide-stone-line border-y border-stone-line">
              {r.service && <Row label="Service" value={r.service} />}
              {r.vehicle && <Row label="Vehicle" value={r.vehicle} />}
              {paidOn && <Row label="Paid on" value={paidOn} />}
            </dl>

            {r.items.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] uppercase tracking-wide text-stone font-semibold mb-2">Items</p>
                <div className="space-y-1.5">
                  {r.items.map((it, i) => (
                    <div key={i} className="flex justify-between gap-4">
                      <span className="text-ink">{it.description} <span className="text-stone">×{it.qty}</span></span>
                      <span className="text-ink font-medium shrink-0">{formatBhd(it.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-stone-line space-y-1.5">
              {r.subtotal != null && <Line label="Subtotal" value={formatBhd(r.subtotal)} />}
              {r.discount > 0 && <Line label={`Discount${r.discountNote ? ` (${r.discountNote})` : ""}`} value={`−${formatBhd(r.discount)}`} />}
              <div className="flex justify-between gap-4 text-base font-semibold text-ink pt-1">
                <span>Total</span>
                <span>{formatBhd(r.total)}</span>
              </div>
            </div>

            {r.payments.length > 1 && (
              <div className="mt-4 pt-4 border-t border-stone-line">
                <p className="text-[11px] uppercase tracking-wide text-stone font-semibold mb-2">Payments</p>
                <div className="space-y-1">
                  {r.payments.map((p, i) => (
                    <Line
                      key={i}
                      label={`${p.type.charAt(0).toUpperCase()}${p.type.slice(1)}${p.method ? ` · ${PAYMENT_METHOD_LABEL[p.method] || p.method}` : ""}`}
                      value={`${p.type === "refund" ? "−" : ""}${formatBhd(p.amount)}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="px-6 pb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-stone">
            <span className="flex items-center gap-1.5">
              {r.businessPhone && (<><Phone size={12} /> {r.businessPhone}</>)}
            </span>
            <PrintButton />
          </div>
        </div>

        <p className="text-center text-xs text-stone mt-5 print:mt-8">
          Issued via <Link href="/" className="font-semibold text-ink">luup<span className="text-teal">a</span></Link> — Bahrain's trusted car care directory
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-stone">{label}</dt>
      <dd className="text-ink font-medium text-right">{value}</dd>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-stone">
      <span>{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
