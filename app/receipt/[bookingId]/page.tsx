import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { CheckCircle2, ReceiptText, Clock, CreditCard, User, Car, CalendarDays, MessageCircle, Phone } from "lucide-react";
import { verifyBookingLink } from "@/lib/signedLink";
import { loadReceipt } from "@/lib/receipt";
import { isUuid } from "@/lib/serverAuth";
import { PAYMENT_METHOD_LABEL, roundFils } from "@/lib/money";
import { canRequestReview, receiptUrlFor, reviewUrlFor } from "@/lib/bookingDispatch";
import { formatPhoneDisplay } from "@/lib/validation";
import ReceiptActions from "@/components/ReceiptActions";

// Public-by-link receipt (the "View receipt" button in the receipt email and
// the link in the WhatsApp message). No login needed — possession of the
// signed link is the access check, same idea as a shared invoice link —
// and it's never indexed or cached.
export const dynamic = "force-dynamic";

// Metadata and the page both need the receipt; cache() makes it one load.
const getReceipt = cache(async (bookingId: string, token: string | undefined) => {
  if (!isUuid(bookingId) || !verifyBookingLink("receipt", bookingId, token)) return null;
  const r = await loadReceipt(bookingId);
  return r && r.paid ? r : null;
});

type Props = { params: Promise<{ bookingId: string }>; searchParams: Promise<{ t?: string }> };

// The title is also the default file name when the receipt is saved as a PDF.
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ bookingId }, { t }] = await Promise.all([params, searchParams]);
  const r = await getReceipt(bookingId, t);
  return {
    title: r ? `Receipt ${r.number} — ${r.businessName}` : "Receipt — Luupa",
    robots: { index: false, follow: false },
  };
}

const TZ = "Asia/Bahrain";
const PAID_VIA: Record<string, string> = { cash: "in cash", card: "by card", benefit: "via BenefitPay" };
const PAYMENT_TYPE_LABEL: Record<string, string> = { deposit: "Deposit", balance: "Balance", full: "Payment", refund: "Refund" };

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });
  return `${date}, ${time}`;
}

function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
}

// preferred_date is a plain calendar date ("2026-10-12") — format it as-is,
// never shifted through a time zone.
function fmtServiceDate(ymd: string): string {
  return new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

const n3 = (n: number) => n.toFixed(3);

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
}

async function siteBase(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  const h = await headers();
  return `${h.get("x-forwarded-proto") || "https"}://${h.get("x-forwarded-host") || h.get("host")}`;
}

export default async function ReceiptPage({ params, searchParams }: Props) {
  const [{ bookingId }, { t }] = await Promise.all([params, searchParams]);
  const r = await getReceipt(bookingId, t);
  if (!r) notFound();

  // Line items, or — when the business only entered a total — one line for
  // the service, priced so subtotal − discount = total.
  const lines = r.items.length > 0
    ? r.items
    : [{ description: r.service || "Service", qty: 1, unitPrice: roundFils(r.total + r.discount), total: roundFils(r.total + r.discount) }];
  const subtotal = roundFils(lines.reduce((s, l) => s + l.total, 0));
  // The owner can type a total that differs from the itemised sum — show
  // the difference so the receipt always adds up.
  const adjustment = roundFils(r.total - (subtotal - r.discount));
  const showSubtotal = lines.length > 1 || r.discount > 0 || adjustment !== 0;

  // Older bookings were paid before payments were itemised: treat as paid in full.
  const gross = r.payments.length ? roundFils(r.payments.filter((p) => p.type !== "refund").reduce((s, p) => s + p.amount, 0)) : r.total;
  const refunded = roundFils(r.payments.filter((p) => p.type === "refund").reduce((s, p) => s + p.amount, 0));
  const netPaid = roundFils(gross - refunded);
  const balanceDue = Math.max(0, roundFils(r.total - gross));
  const [whole, fils] = n3(netPaid).split(".");

  const phone = formatPhoneDisplay(r.businessPhone);
  const whatsapp = formatPhoneDisplay(r.businessWhatsapp);
  const businessLine = [r.businessArea, r.businessCr ? `CR ${r.businessCr}` : null, phone].filter(Boolean) as string[];
  const first = r.customerName.split(" ")[0];
  const greetName = first && first !== "there" ? `, ${first}` : "";

  // Printed receipts become a way in: scan to review (when one is still
  // welcome), otherwise scan to open this receipt online.
  const base = await siteBase();
  const reviewOpen = canRequestReview(r).ok;
  const qrSvg = await QRCode.toString(reviewOpen ? reviewUrlFor(base, r.bookingId) : receiptUrlFor(base, r.bookingId), {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#0F3D2E", light: "#FFFFFF" },
  });

  const tiles = [
    {
      icon: User,
      label: "Billed to",
      main: r.customerName === "there" ? "Customer" : r.customerName,
      sub: [formatPhoneDisplay(r.customerContact), r.customerEmail],
    },
    (r.vehicleName || r.vehiclePlate) && {
      icon: Car,
      label: "Vehicle",
      main: r.vehicleName || "Vehicle",
      sub: [r.vehiclePlate ? `Plate ${r.vehiclePlate}` : null],
    },
    r.serviceDate && {
      icon: CalendarDays,
      label: "Serviced",
      main: fmtServiceDate(r.serviceDate),
      sub: [r.serviceTime, r.source !== "manual" ? "Booked on Luupa" : null],
    },
  ].filter(Boolean) as { icon: typeof User; label: string; main: string; sub: (string | null)[] }[];
  // "Billed to" gets the widest column — it carries the email address.
  // Phones: "Billed to" full width, the other two side by side.
  const tileCols = tiles.length === 3 ? "grid-cols-2 sm:grid-cols-[1.45fr_1fr_1fr]" : tiles.length === 2 ? "grid-cols-1 sm:grid-cols-[1.3fr_1fr]" : "grid-cols-1";

  return (
    <div className="bg-canvas2 min-h-screen px-4 py-8 sm:py-12 print:bg-white print:p-0 print:min-h-0">
      {/* margin: 0 also removes the browser's own date/title/URL lines in
          Chrome and Edge; the sheet carries its own padding instead. */}
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
          .receipt-sheet, .receipt-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="max-w-[640px] mx-auto print:max-w-[172mm] print:pt-[14mm]">
        <article className="receipt-sheet bg-white rounded-[22px] overflow-hidden border border-stone-line shadow-[0_24px_60px_-30px_rgba(6,37,28,0.35)] print:shadow-none break-inside-avoid fade-up">
          {/* ---------- Header: business, status, total ---------- */}
          <header className="relative overflow-hidden bg-navy text-white px-6 sm:px-8 pt-6 pb-7">
            <div aria-hidden className="absolute -top-24 -right-16 w-64 h-64 rounded-full bg-[#154A39]" />
            <div aria-hidden className="absolute -bottom-36 right-28 w-56 h-56 rounded-full bg-[#12442F]" />

            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {r.businessLogo ? (
                  // Plain <img>, not next/image: lazy loading could leave it blank in a print.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.businessLogo} alt="" className="w-12 h-12 rounded-[13px] object-cover bg-white shrink-0" />
                ) : (
                  <span className="w-12 h-12 rounded-[13px] bg-white text-navy flex items-center justify-center font-display text-xl font-bold shrink-0">
                    {initials(r.businessName)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="font-display text-[22px] font-semibold leading-tight truncate">{r.businessName}</p>
                  {businessLine.length > 0 && (
                    <p className="text-xs text-white/60 mt-0.5">
                      {businessLine.map((part, i) => (
                        <span key={part} className="whitespace-nowrap">{i > 0 && " · "}{part}</span>
                      ))}
                    </p>
                  )}
                </div>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1.5 bg-teal-light text-navy-dim text-xs font-semibold px-3 py-1.5 rounded-full">
                <CheckCircle2 size={13} /> {refunded > 0 ? "Refunded in part" : "Paid"}
              </span>
            </div>

            <p className="relative mt-7 text-[11px] uppercase tracking-[0.12em] font-semibold text-white/55">Total paid</p>
            <p className="relative font-display font-semibold leading-none tracking-tight mt-1 text-[52px] sm:text-[66px]">
              BHD {whole}<span className="text-[30px] sm:text-[38px] text-white/50">.{fils}</span>
            </p>

            <div className="relative flex flex-wrap gap-2 mt-5">
              <Chip icon={ReceiptText}>{r.number}</Chip>
              {r.paidAt && <Chip icon={Clock}>{fmtDateTime(r.paidAt)}</Chip>}
              {r.methodLabel && <Chip icon={CreditCard}>{r.methodLabel}</Chip>}
            </div>
          </header>

          <div className="px-6 sm:px-8 pt-6 pb-2">
            {/* ---------- Customer / vehicle / service ---------- */}
            <div className={`grid ${tileCols} gap-2.5`}>
              {tiles.map(({ icon: Icon, label, main, sub }, i) => (
                <div key={label} className={`rounded-2xl bg-canvas2 p-3.5 ${i === 0 && tiles.length === 3 ? "col-span-2 sm:col-span-1" : ""}`}>
                  <span className="w-[30px] h-[30px] rounded-[9px] bg-white flex items-center justify-center text-navy mb-2.5">
                    <Icon size={15} />
                  </span>
                  <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-stone">{label}</p>
                  <p className="text-sm font-semibold text-ink mt-1 break-words">{main}</p>
                  {sub.filter(Boolean).map((line) => (
                    <p key={line} className="text-xs text-stone [overflow-wrap:anywhere]">{line}</p>
                  ))}
                </div>
              ))}
            </div>

            {/* ---------- Line items ---------- */}
            <div className="flex items-baseline justify-between mt-7 pb-1.5 border-b border-stone-line">
              <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-stone">Services</p>
              <p className="text-xs text-stone">{lines.length} item{lines.length === 1 ? "" : "s"} · BHD</p>
            </div>
            <div className="divide-y divide-[#EFEDE8]">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_96px_88px] gap-x-3 items-baseline py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink break-words">{l.description}</p>
                    <p className="sm:hidden text-xs text-stone tabular-nums">{l.qty} × {n3(l.unitPrice)}</p>
                  </div>
                  <p className="hidden sm:block text-xs text-stone text-right tabular-nums">{l.qty} × {n3(l.unitPrice)}</p>
                  <p className="text-sm font-medium text-ink text-right tabular-nums">{n3(l.total)}</p>
                </div>
              ))}
            </div>

            {/* ---------- Totals ---------- */}
            <div className="rounded-2xl bg-canvas2 px-4 sm:px-5 py-3.5 mt-1 text-sm tabular-nums">
              {showSubtotal && <TotalLine label="Subtotal" value={n3(subtotal)} />}
              {r.discount > 0 && (
                <TotalLine
                  label={
                    <>
                      Discount
                      {r.discountNote && (
                        <span className="ml-1.5 text-[11px] font-semibold text-teal-dim bg-teal/10 px-2 py-0.5 rounded-full">{r.discountNote}</span>
                      )}
                    </>
                  }
                  value={`−${n3(r.discount)}`}
                  valueClass="text-teal-dim"
                />
              )}
              {adjustment !== 0 && <TotalLine label="Adjustment" value={`${adjustment < 0 ? "−" : "+"}${n3(Math.abs(adjustment))}`} />}
              <div className={`flex items-baseline justify-between gap-4 ${showSubtotal ? "border-t border-[#E2DFD8] mt-2 pt-3" : ""}`}>
                <span className="font-semibold text-ink">Total</span>
                <span className="font-display text-[28px] font-semibold text-ink leading-none">BHD {n3(r.total)}</span>
              </div>

              {(r.payments.length > 1 || refunded > 0) && (
                <div className="border-t border-[#E2DFD8] mt-3 pt-2">
                  {r.payments.map((p, i) => (
                    <TotalLine
                      key={i}
                      label={[PAYMENT_TYPE_LABEL[p.type] || p.type, p.method ? PAYMENT_METHOD_LABEL[p.method] || p.method : null, fmtDay(p.at)].filter(Boolean).join(" · ")}
                      value={`${p.type === "refund" ? "−" : ""}${n3(p.amount)}`}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between gap-4 flex-wrap mt-2 pt-1 text-[13px]">
                <span className="flex items-center gap-1.5 text-stone">
                  <CheckCircle2 size={14} className="text-teal" />
                  {[`Paid${netPaid !== r.total ? ` ${n3(netPaid)}` : ""}${r.method && PAID_VIA[r.method] ? ` ${PAID_VIA[r.method]}` : ""}`, r.paidAt ? fmtDay(r.paidAt) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <span className="text-stone">
                  Balance due <b className="font-semibold text-ink">{n3(balanceDue)}</b>
                </span>
              </div>
            </div>
          </div>

          {/* ---------- Tear-off stub ---------- */}
          <div aria-hidden className="relative h-[26px] mt-5">
            <span className="absolute -left-[13px] top-0 w-[26px] h-[26px] rounded-full bg-canvas2 border border-stone-line print:bg-white" />
            <span className="absolute -right-[13px] top-0 w-[26px] h-[26px] rounded-full bg-canvas2 border border-stone-line print:bg-white" />
            <span className="absolute left-6 right-6 top-3 border-t-2 border-dashed border-[#E2DFD8]" />
          </div>

          <div className="px-6 sm:px-8 pt-1.5 pb-6 flex items-center justify-between gap-5">
            <div className="min-w-0">
              <p className="font-display text-2xl font-semibold text-ink leading-tight">
                {r.hasReview ? `Thanks for your review${greetName}.` : `Thanks for visiting${greetName}.`}
              </p>
              <p className="text-[13px] text-stone mt-1.5 max-w-[330px] leading-relaxed">
                {reviewOpen
                  ? `Enjoyed it? Scan to rate ${r.businessName}. It takes 20 seconds and helps them a lot.`
                  : r.hasReview
                  ? "It helps other drivers in Bahrain find good work. Scan to open this receipt online anytime."
                  : "Scan to open this receipt online anytime."}
              </p>
              {(whatsapp || phone) && (
                <p className="text-[13px] text-ink mt-2.5 flex items-center gap-1.5">
                  {whatsapp ? <MessageCircle size={14} className="text-teal" /> : <Phone size={14} className="text-teal" />}
                  Questions? {whatsapp ? `WhatsApp ${whatsapp}` : `Call ${phone}`}
                </p>
              )}
            </div>
            <div className="shrink-0 text-center">
              <div
                className="w-[92px] h-[92px] p-1.5 rounded-xl border border-stone-line bg-white [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <p className="text-[11px] text-stone mt-1.5">{reviewOpen ? "Rate your visit" : "View online"}</p>
            </div>
          </div>

          <div className="border-t border-[#EFEDE8] px-6 sm:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px] text-stone-dim">
            <span>Paid directly to {r.businessName}. Luupa provides booking software and does not handle payments.</span>
            <span className="whitespace-nowrap">
              Issued via{" "}
              <Link href="/" className="font-semibold text-ink">
                luup<span className="text-teal">a</span>
              </Link>
            </span>
          </div>
        </article>

        <ReceiptActions />
      </div>
    </div>
  );
}

function Chip({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-white/75 bg-white/[0.08] border border-white/[0.12] px-2.5 py-1.5 rounded-full">
      <Icon size={13} /> {children}
    </span>
  );
}

function TotalLine({ label, value, valueClass = "text-ink" }: { label: React.ReactNode; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-stone">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
