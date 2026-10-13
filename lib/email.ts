import { Resend } from "resend";
import { formatBhd } from "@/lib/money";
import type { ReceiptData } from "@/lib/receipt";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = "Luupa <hello@luupa.net>";
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://luupa.net").replace(/\/+$/, "");

// The Resend SDK does NOT throw when the API rejects a message (unverified
// domain, bad address, plan limits) — it resolves with { data: null, error }.
// Every sender used to rely on try/catch alone, so a rejected email was
// reported to the UI as "sent" and stamped receipt_sent_at anyway.
type SendResult = { sent: true } | { sent: false; reason: "not_configured" | "send_failed" };

async function deliver(label: string, payload: Parameters<Resend["emails"]["send"]>[0]): Promise<SendResult> {
  if (!resend) return { sent: false, reason: "not_configured" };
  try {
    const { error } = await resend.emails.send(payload);
    if (error) {
      console.error(`Failed to send ${label} email:`, error);
      return { sent: false, reason: "send_failed" };
    }
    return { sent: true };
  } catch (err) {
    console.error(`Failed to send ${label} email:`, err);
    return { sent: false, reason: "send_failed" };
  }
}

// SECURITY: every value interpolated into an HTML email template must be
// escaped — even values that come from our own database, since a customer
// can put arbitrary text (including HTML) into their own name at booking
// time. Escaping here is defense in depth on top of the server-side lookups
// in the API routes that call these functions.
function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "\"": return "&quot;";
      case "'": return "&#39;";
      default: return c;
    }
  });
}

// Header values (subjects) aren't HTML — escaping them would show "&amp;"
// in the inbox. Strip control characters / newlines instead, so a business
// or customer name can't smuggle extra headers into the message.
function headerSafe(value: unknown, max = 120): string {
  return String(value ?? "").replace(/[\r\n\t\x00-\x1f]+/g, " ").trim().slice(0, max);
}

// Only http(s) links ever go into an href/src.
function safeUrl(value: unknown): string {
  const s = String(value ?? "");
  return /^https?:\/\//i.test(s) ? escapeHtml(s) : "";
}

const BRAND = { navy: "#0F3D2E", navyDim: "#06251C", teal: "#059669", ink: "#14181F", stone: "#6B7280", line: "#E7E5E0", canvas2: "#F7F6F3" };

// One consistent, mobile-first shell for every transactional email: brand
// bar, white card, quiet footer. Table-based + inline styles because that's
// what renders reliably across Gmail/Outlook/Apple Mail.
function emailShell({ preheader, body, footer }: { preheader: string; body: string; footer?: string }): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:${BRAND.canvas2};">
  <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.canvas2};padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding:0 4px 14px 4px;font-size:22px;font-weight:700;letter-spacing:.5px;color:${BRAND.ink};">luup<span style="color:${BRAND.teal};">a</span></td></tr>
        <tr><td style="background:#ffffff;border:1px solid ${BRAND.line};border-radius:18px;overflow:hidden;">${body}</td></tr>
        <tr><td style="padding:16px 8px;text-align:center;color:${BRAND.stone};font-size:12px;line-height:18px;">${footer ?? "Sent via Luupa — Bahrain's trusted car care directory."}</td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

function button(href: string, label: string, color = BRAND.teal): string {
  return `<a href="${href}" style="display:inline-block;background:${color};color:#ffffff;font-weight:600;font-size:15px;padding:13px 26px;border-radius:999px;text-decoration:none;">${escapeHtml(label)}</a>`;
}

// If Resend isn't configured yet (no API key set), these quietly do nothing
// instead of breaking the approval/verification flow — email is a nice-to-have
// on top of the core feature, not a dependency of it.

export async function sendApprovalEmail(to: string, businessNameRaw: string) {
  const body = `
    <div style="padding:28px 26px;">
      <div style="display:inline-block;background:#ECFDF5;color:${BRAND.teal};font-size:12px;font-weight:700;padding:5px 11px;border-radius:999px;letter-spacing:.5px;">● LISTING APPROVED</div>
      <h1 style="margin:14px 0 6px 0;font-size:24px;color:${BRAND.ink};">You're live on Luupa!</h1>
      <p style="margin:0 0 18px 0;font-size:15px;line-height:22px;color:${BRAND.stone};">Hi ${escapeHtml(businessNameRaw)}, your listing has been reviewed and approved. Customers searching Luupa can now find you, book you, and leave reviews.</p>
      ${button(`${SITE}/business/dashboard`, "Open your dashboard", BRAND.navy)}
    </div>`;
  return deliver("approval", {
    from: FROM,
    to,
    subject: "You're live on Luupa 🎉",
    html: emailShell({ preheader: "Your listing is approved and live.", body }),
  });
}

export async function sendVerifiedEmail(to: string, businessNameRaw: string, verifiedUntil: string | null) {
  const untilText = verifiedUntil
    ? ` through ${new Date(verifiedUntil).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bahrain" })}`
    : "";
  const body = `
    <div style="padding:28px 26px;">
      <div style="display:inline-block;background:#ECFDF5;color:${BRAND.teal};font-size:12px;font-weight:700;padding:5px 11px;border-radius:999px;letter-spacing:.5px;">✓ VERIFIED</div>
      <h1 style="margin:14px 0 6px 0;font-size:24px;color:${BRAND.ink};">You're verified!</h1>
      <p style="margin:0 0 18px 0;font-size:15px;line-height:22px;color:${BRAND.stone};">Hi ${escapeHtml(businessNameRaw)}, your business now carries the verified badge on Luupa${escapeHtml(untilText)} — it shows next to your name everywhere customers see you.</p>
      ${button(`${SITE}/business/dashboard`, "Open your dashboard", BRAND.navy)}
    </div>`;
  return deliver("verified", {
    from: FROM,
    to,
    subject: "You're verified on Luupa ✓",
    html: emailShell({ preheader: "Your verified badge is live.", body }),
  });
}

type ReminderDetails = {
  businessName: string;
  customerName: string;
  service?: string | null;
  // Pre-formatted, human-readable strings (e.g. "Tuesday, 23 September 2026"
  // and "2:30 PM") — the caller owns date/time math, this just renders them.
  date: string;
  time: string;
  whatsapp?: string | null;
  phone?: string | null;
};

export async function sendReminderEmail(to: string, details: ReminderDetails) {
  const businessName = escapeHtml(details.businessName);
  const service = escapeHtml(details.service);
  const contact = escapeHtml(details.whatsapp || details.phone);
  const body = `
    <div style="padding:28px 26px;">
      <div style="display:inline-block;background:#ECFDF5;color:${BRAND.teal};font-size:12px;font-weight:700;padding:5px 11px;border-radius:999px;letter-spacing:.5px;">● TOMORROW</div>
      <h1 style="margin:14px 0 6px 0;font-size:22px;color:${BRAND.ink};">Your booking is coming up</h1>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:22px;color:${BRAND.stone};">Hi ${escapeHtml(details.customerName.split(" ")[0])}, just a reminder — your booking with <b style="color:${BRAND.ink};">${businessName}</b>${service ? ` for ${service}` : ""} is on <b style="color:${BRAND.ink};">${escapeHtml(details.date)}</b> at <b style="color:${BRAND.ink};">${escapeHtml(details.time)}</b>.</p>
      ${contact ? `<p style="margin:0 0 18px 0;font-size:13px;color:${BRAND.stone};">Need to reach them beforehand? ${contact}</p>` : ""}
      ${button(`${SITE}/account/profile?tab=bookings`, "View my bookings", BRAND.navy)}
    </div>`;
  return deliver("reminder", {
    from: FROM,
    to,
    subject: headerSafe(`Reminder: your booking with ${details.businessName} is tomorrow`, 140),
    html: emailShell({ preheader: `${details.date} at ${details.time} with ${details.businessName}.`, body }),
  });
}

// ---------------------------------------------------------------------------
// Receipt — sent automatically the moment a booking is paid.
// ---------------------------------------------------------------------------
export async function sendReceiptEmail(to: string, r: ReceiptData, receiptUrl: string) {
  const row = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:7px 0;color:${BRAND.stone};font-size:14px;">${label}</td><td style="padding:7px 0;text-align:right;font-size:14px;color:${BRAND.ink};${strong ? "font-weight:700;" : ""}">${value}</td></tr>`;
  const items = r.items
    .map((it) => row(`${escapeHtml(it.description)} <span style="color:${BRAND.stone};">×${it.qty}</span>`, escapeHtml(formatBhd(it.total))))
    .join("");
  const paidOn = r.paidAt ? new Date(r.paidAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bahrain" }) : "";
  const logo = safeUrl(r.businessLogo);

  const body = `
    <div style="background:linear-gradient(135deg,${BRAND.navy},${BRAND.navyDim});background-color:${BRAND.navy};padding:26px 26px 22px 26px;color:#ffffff;">
      ${logo ? `<img src="${logo}" alt="" width="44" height="44" style="border-radius:12px;display:block;margin-bottom:12px;object-fit:cover;" />` : ""}
      <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;opacity:.65;">Receipt · ${escapeHtml(r.number)}</div>
      <div style="font-size:22px;font-weight:700;margin-top:4px;">${escapeHtml(r.businessName)}</div>
      <div style="margin-top:18px;font-size:13px;opacity:.7;">Total paid</div>
      <div style="font-size:34px;font-weight:800;letter-spacing:-.5px;">${escapeHtml(formatBhd(r.total))}</div>
      <div style="display:inline-block;margin-top:10px;background:rgba(16,185,129,.2);color:#A7F3D0;font-size:12px;font-weight:700;padding:5px 11px;border-radius:999px;">✓ PAID${r.methodLabel ? ` · ${escapeHtml(r.methodLabel.toUpperCase())}` : ""}</div>
    </div>
    <div style="padding:22px 26px 26px 26px;">
      <p style="margin:0 0 14px 0;font-size:15px;color:${BRAND.ink};">Hi ${escapeHtml(r.customerName.split(" ")[0])}, thanks for choosing ${escapeHtml(r.businessName)}. Here's your receipt.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${BRAND.line};">
        ${r.service ? row("Service", escapeHtml(r.service)) : ""}
        ${r.vehicle ? row("Vehicle", escapeHtml(r.vehicle)) : ""}
        ${paidOn ? row("Paid on", escapeHtml(paidOn)) : ""}
      </table>
      ${items ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${BRAND.line};margin-top:6px;">${items}${r.subtotal != null ? row("Subtotal", escapeHtml(formatBhd(r.subtotal))) : ""}</table>` : ""}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${BRAND.line};margin-top:6px;">
        ${r.discount > 0 ? row(`Discount${r.discountNote ? ` <span style="color:${BRAND.stone};">(${escapeHtml(r.discountNote)})</span>` : ""}`, `−${escapeHtml(formatBhd(r.discount))}`) : ""}
        ${row("Total", escapeHtml(formatBhd(r.total)), true)}
      </table>
      <div style="text-align:center;margin-top:22px;">${button(safeUrl(receiptUrl), "View receipt online", BRAND.navy)}</div>
    </div>`;

  return deliver("receipt", {
    from: FROM,
    to,
    subject: headerSafe(`${r.businessName} — your receipt ${r.number}`, 140),
    html: emailShell({
      preheader: `${formatBhd(r.total)} paid to ${r.businessName}. Thank you!`,
      body,
      footer: `${escapeHtml(r.businessName)}${r.businessPhone ? ` · ${escapeHtml(r.businessPhone)}` : ""}<br/>Receipt issued via Luupa.`,
    }),
  });
}

// ---------------------------------------------------------------------------
// Review request — a SEPARATE email after the receipt (scheduled a little
// later by default, so it lands once the customer has driven off, not
// stacked on top of the receipt). Each star is its own link straight into
// the review page with that rating pre-selected: one tap from the inbox.
// ---------------------------------------------------------------------------
export async function sendReviewRequestEmail(
  to: string,
  d: { businessName: string; customerName: string; service?: string | null; reviewUrl: string },
  opts: { scheduledAt?: string } = {}
) {
  const base = safeUrl(d.reviewUrl);
  const joiner = d.reviewUrl.includes("?") ? "&amp;" : "?";
  const stars = [1, 2, 3, 4, 5]
    .map(
      (n) =>
        `<a href="${base}${joiner}rating=${n}" style="display:inline-block;text-decoration:none;font-size:34px;line-height:40px;color:${BRAND.teal};padding:0 3px;" aria-label="${n} star${n === 1 ? "" : "s"}">★</a>`
    )
    .join("");
  const body = `
    <div style="padding:30px 26px;text-align:center;">
      <div style="font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:${BRAND.teal};font-weight:700;">How did we do?</div>
      <h1 style="margin:8px 0 0 0;font-size:24px;line-height:30px;color:${BRAND.ink};">How was your visit to ${escapeHtml(d.businessName)}?</h1>
      <p style="margin:12px 0 0 0;font-size:15px;line-height:22px;color:${BRAND.stone};">Hi ${escapeHtml(d.customerName.split(" ")[0])}${d.service ? ` — hope you're happy with your ${escapeHtml(d.service)}` : ""}. Tap a star to rate it; it takes less than a minute and helps other drivers in Bahrain choose with confidence.</p>
      <div style="margin:22px 0 6px 0;">${stars}</div>
      <div style="font-size:12px;color:${BRAND.stone};">Tap to rate</div>
      <div style="margin-top:22px;">${button(base, "Write a review")}</div>
    </div>`;
  return deliver("review request", {
    from: FROM,
    to,
    subject: headerSafe(`How was ${d.businessName}? Leave a quick review ⭐`, 140),
    html: emailShell({ preheader: `Rate your visit to ${d.businessName} — one tap.`, body }),
    ...(opts.scheduledAt ? { scheduledAt: opts.scheduledAt } : {}),
  });
}

// ---------------------------------------------------------------------------
// New booking — tells the owner even when the dashboard isn't open.
// ---------------------------------------------------------------------------
export async function sendNewBookingOwnerEmail(
  to: string,
  d: { businessName: string; customerName: string; service?: string | null; date?: string | null; time?: string | null; vehicle?: string | null; note?: string | null; dashboardUrl: string }
) {
  const when = [d.date, d.time].filter(Boolean).join(" · ");
  const body = `
    <div style="padding:26px;">
      <div style="display:inline-block;background:#ECFDF5;color:${BRAND.teal};font-size:12px;font-weight:700;padding:5px 11px;border-radius:999px;letter-spacing:.5px;">● NEW BOOKING REQUEST</div>
      <h1 style="margin:14px 0 4px 0;font-size:22px;color:${BRAND.ink};">${escapeHtml(d.customerName)} wants to book</h1>
      <p style="margin:0 0 16px 0;font-size:14px;color:${BRAND.stone};">via Luupa · ${escapeHtml(d.businessName)}</p>
      ${detailsTable([
        ["Service", d.service || "Not specified"],
        ["When", when || "Flexible"],
        ["Vehicle", d.vehicle],
        ["Note", d.note],
      ])}
      <p style="margin:16px 0 20px 0;font-size:14px;color:${BRAND.stone};">Customers book faster with businesses that reply quickly — confirm or decline from your bookings board.</p>
      ${button(safeUrl(d.dashboardUrl), "Review booking", BRAND.navy)}
    </div>`;
  return deliver("new booking", {
    from: FROM,
    to,
    subject: headerSafe(`New booking: ${d.customerName}${d.service ? ` — ${d.service}` : ""}`, 140),
    html: emailShell({ preheader: `${d.customerName} requested ${d.service || "a booking"}${when ? ` for ${when}` : ""}.`, body }),
  });
}

// ---------------------------------------------------------------------------
// The customer cancelled — the owner hears about it right away.
// ---------------------------------------------------------------------------
export async function sendBookingCancelledOwnerEmail(
  to: string,
  d: { businessName: string; customerName: string; service?: string | null; date?: string | null; time?: string | null; dashboardUrl: string }
) {
  const when = [d.date, d.time].filter(Boolean).join(" · ");
  const body = `
    <div style="padding:26px;">
      <div style="display:inline-block;background:#FEF2F2;color:#B91C1C;font-size:12px;font-weight:700;padding:5px 11px;border-radius:999px;letter-spacing:.5px;">● BOOKING CANCELLED</div>
      <h1 style="margin:14px 0 4px 0;font-size:22px;color:${BRAND.ink};">${escapeHtml(d.customerName)} cancelled their booking</h1>
      <p style="margin:0 0 16px 0;font-size:14px;color:${BRAND.stone};">${escapeHtml(d.businessName)} · that slot is free again.</p>
      ${detailsTable([
        ["Service", d.service || "Not specified"],
        ["When", when || "Flexible"],
      ])}
      <div style="margin-top:20px;">${button(safeUrl(d.dashboardUrl), "Open bookings", BRAND.navy)}</div>
    </div>`;
  return deliver("cancellation", {
    from: FROM,
    to,
    subject: headerSafe(`Cancelled: ${d.customerName}${when ? ` — ${when}` : ""}`, 140),
    html: emailShell({ preheader: `${d.customerName} cancelled${when ? ` (${when})` : ""}.`, body }),
  });
}

// ---------------------------------------------------------------------------
// Booking status updates for the customer — the moment the business
// confirms, declines, or cancels, the customer knows (before, they only
// found out if they happened to have My bookings open).
// ---------------------------------------------------------------------------
export type CustomerStatusUpdate = "confirmed" | "declined" | "cancelled";

export async function sendBookingStatusCustomerEmail(
  to: string,
  status: CustomerStatusUpdate,
  d: {
    businessName: string;
    customerName: string;
    service?: string | null;
    date?: string | null;
    time?: string | null;
    businessPhone?: string | null;
    businessWhatsapp?: string | null;
    listingUrl: string;
  }
) {
  const when = [d.date, d.time].filter(Boolean).join(" · ");
  const first = escapeHtml(d.customerName.split(" ")[0]);
  const copy = {
    confirmed: {
      badge: `<div style="display:inline-block;background:#ECFDF5;color:${BRAND.teal};font-size:12px;font-weight:700;padding:5px 11px;border-radius:999px;letter-spacing:.5px;">✓ CONFIRMED</div>`,
      title: `You're booked with ${escapeHtml(d.businessName)}`,
      text: `Hi ${first}, ${escapeHtml(d.businessName)} confirmed your booking. See you there!`,
      subject: `Confirmed: ${d.businessName}${when ? ` — ${when}` : ""}`,
      cta: { href: `${SITE}/account/profile?tab=bookings`, label: "View my booking" },
    },
    declined: {
      badge: `<div style="display:inline-block;background:${BRAND.canvas2};color:${BRAND.stone};font-size:12px;font-weight:700;padding:5px 11px;border-radius:999px;letter-spacing:.5px;">BOOKING UPDATE</div>`,
      title: `${escapeHtml(d.businessName)} couldn't take this booking`,
      text: `Hi ${first}, unfortunately ${escapeHtml(d.businessName)} can't take your request${when ? " at that time" : ""}. Other trusted businesses on Luupa may have a slot — it only takes a minute to book.`,
      subject: `Booking update from ${d.businessName}`,
      cta: { href: `${SITE}/browse`, label: "Find another business" },
    },
    cancelled: {
      badge: `<div style="display:inline-block;background:#FEF2F2;color:#B91C1C;font-size:12px;font-weight:700;padding:5px 11px;border-radius:999px;letter-spacing:.5px;">BOOKING CANCELLED</div>`,
      title: `Your booking with ${escapeHtml(d.businessName)} was cancelled`,
      text: `Hi ${first}, ${escapeHtml(d.businessName)} has cancelled this booking. If you weren't expecting this, reach out to them directly.`,
      subject: `Cancelled: your booking with ${d.businessName}`,
      cta: { href: safeUrl(d.listingUrl), label: "Rebook" },
    },
  }[status];

  const contact = d.businessWhatsapp || d.businessPhone;
  const body = `
    <div style="padding:26px;">
      ${copy.badge}
      <h1 style="margin:14px 0 6px 0;font-size:22px;line-height:28px;color:${BRAND.ink};">${copy.title}</h1>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:22px;color:${BRAND.stone};">${copy.text}</p>
      ${detailsTable([
        ["Service", d.service || "Not specified"],
        ["When", when || "Flexible — they'll confirm the time with you"],
        ["Contact", contact ? `+${String(contact).replace(/\D/g, "")}` : null],
      ])}
      <div style="margin-top:20px;">${button(copy.cta.href, copy.cta.label, BRAND.navy)}</div>
    </div>`;
  return deliver(`booking ${status}`, {
    from: FROM,
    to,
    subject: headerSafe(copy.subject, 140),
    html: emailShell({ preheader: `${d.businessName}: booking ${status}.`, body }),
  });
}

// ---------------------------------------------------------------------------
// The business answered your review — closes the loop for the customer.
// ---------------------------------------------------------------------------
export async function sendReviewReplyEmail(
  to: string,
  d: { businessName: string; customerName: string; reply: string; listingUrl: string }
) {
  const body = `
    <div style="padding:26px;">
      <h1 style="margin:0 0 6px 0;font-size:21px;color:${BRAND.ink};">${escapeHtml(d.businessName)} responded to your review</h1>
      <p style="margin:0 0 16px 0;font-size:14px;color:${BRAND.stone};">Hi ${escapeHtml(d.customerName.split(" ")[0])}, here's their official response:</p>
      <div style="border-left:3px solid ${BRAND.teal};background:${BRAND.canvas2};padding:14px 16px;border-radius:0 12px 12px 0;font-size:15px;line-height:22px;color:${BRAND.ink};white-space:pre-wrap;">${escapeHtml(d.reply)}</div>
      <div style="margin-top:20px;">${button(safeUrl(d.listingUrl), "See it on Luupa", BRAND.navy)}</div>
    </div>`;
  return deliver("review reply", {
    from: FROM,
    to,
    subject: headerSafe(`${d.businessName} responded to your review`, 140),
    html: emailShell({ preheader: `Official response from ${d.businessName}.`, body }),
  });
}

// Label/value rows; null values are skipped. Values are escaped here.
// ---------------------------------------------------------------------------
// Contact form — a copy to Luupa's support inbox. Reply goes straight to the
// sender when they left an email; the phone is there for a WhatsApp reply.
// ---------------------------------------------------------------------------
export async function sendContactMessageEmail(
  to: string,
  d: { name: string; phone: string; email?: string | null; role: string; topic: string; car?: string | null; message: string; adminUrl: string }
) {
  const whatsapp = `https://wa.me/${d.phone.replace(/\D/g, "")}`;
  const body = `
    <div style="padding:26px;">
      <div style="display:inline-block;background:#ECFDF5;color:${BRAND.teal};font-size:12px;font-weight:700;padding:5px 11px;border-radius:999px;letter-spacing:.5px;">● NEW MESSAGE</div>
      <h1 style="margin:14px 0 4px 0;font-size:22px;color:${BRAND.ink};">${escapeHtml(d.topic)}</h1>
      <p style="margin:0 0 16px 0;font-size:14px;color:${BRAND.stone};">From the Luupa contact form</p>
      ${detailsTable([
        ["Name", d.name],
        ["Phone", d.phone],
        ["Email", d.email],
        ["They are", d.role],
        ["Car", d.car],
      ])}
      <div style="margin:16px 0 20px 0;background:${BRAND.canvas2};border-radius:12px;padding:14px 16px;font-size:15px;line-height:22px;color:${BRAND.ink};white-space:pre-wrap;">${escapeHtml(d.message)}</div>
      ${button(safeUrl(whatsapp), "Reply on WhatsApp", BRAND.navy)}
      <p style="margin:16px 0 0 0;font-size:13px;color:${BRAND.stone};">Also saved in your <a href="${safeUrl(d.adminUrl)}" style="color:${BRAND.teal};">admin inbox</a>.</p>
    </div>`;
  return deliver("contact message", {
    from: FROM,
    to,
    ...(d.email ? { replyTo: d.email } : {}),
    subject: headerSafe(`Contact form: ${d.topic} — ${d.name}`, 140),
    html: emailShell({ preheader: d.message.slice(0, 120), body, footer: "Sent from the contact form on Luupa." }),
  });
}

function detailsTable(rows: [string, string | null | undefined][]): string {
  const cells = rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;color:${BRAND.stone};font-size:14px;width:90px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:14px;color:${BRAND.ink};font-weight:600;">${escapeHtml(value)}</td></tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${BRAND.line};border-bottom:1px solid ${BRAND.line};">${cells}</table>`;
}
