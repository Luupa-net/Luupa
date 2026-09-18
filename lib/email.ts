import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = "Luupa <hello@luupa.net>";

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

// If Resend isn't configured yet (no API key set), these quietly do nothing
// instead of breaking the approval/verification flow — email is a nice-to-have
// on top of the core feature, not a dependency of it.

export async function sendApprovalEmail(to: string, businessName: string) {
  if (!resend) return;
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "You're live on Luupa 🎉",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #152A4E;">You're live on Luupa!</h2>
          <p>Hi ${businessName},</p>
          <p>Good news — your listing has been reviewed and approved. Customers searching Luupa can now find and contact you directly.</p>
          <p><a href="https://luupa.net/business/dashboard" style="display:inline-block; background:#C4633B; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; margin-top:12px;">View your dashboard</a></p>
          <p style="color:#6B7280; font-size:13px; margin-top:24px;">— The Luupa team</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send approval email:", err);
  }
}

export async function sendVerifiedEmail(to: string, businessName: string, verifiedUntil: string | null) {
  if (!resend) return;
  const untilText = verifiedUntil
    ? ` through ${new Date(verifiedUntil).toLocaleDateString()}`
    : "";
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "You're verified on Luupa ✓",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #152A4E;">You're verified!</h2>
          <p>Hi ${businessName},</p>
          <p>Your business now has the verified badge on Luupa${untilText} — it'll show next to your name everywhere customers see you.</p>
          <p><a href="https://luupa.net/business/dashboard" style="display:inline-block; background:#C4633B; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; margin-top:12px;">View your dashboard</a></p>
          <p style="color:#6B7280; font-size:13px; margin-top:24px;">— The Luupa team</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send verified email:", err);
  }
}

type InvoiceDetails = {
  businessName: string;
  customerName: string;
  service?: string;
  vehicle?: string;
  amount?: string;
  paymentMethod: "cash" | "card";
  qrUrl?: string;
};

export async function sendInvoiceEmail(to: string, details: InvoiceDetails) {
  if (!resend) return { sent: false, reason: "not_configured" };
  try {
    const businessName = escapeHtml(details.businessName);
    const customerName = escapeHtml(details.customerName);
    const service = escapeHtml(details.service);
    const vehicle = escapeHtml(details.vehicle);
    const amount = escapeHtml(details.amount);
    // qrUrl is interpolated into an `src="..."` attribute — escaping at
    // least the quote character stops it from breaking out of the attribute.
    const qrUrl = escapeHtml(details.qrUrl);

    await resend.emails.send({
      from: FROM,
      to,
      subject: `Invoice from ${businessName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #152A4E;">Invoice from ${businessName}</h2>
          <p>Hi ${customerName},</p>
          <table style="width: 100%; margin: 16px 0; font-size: 14px;">
            ${service ? `<tr><td style="color:#6B7280; padding:4px 0;">Service</td><td style="text-align:right; font-weight:600;">${service}</td></tr>` : ""}
            ${vehicle ? `<tr><td style="color:#6B7280; padding:4px 0;">Vehicle</td><td style="text-align:right;">${vehicle}</td></tr>` : ""}
            ${amount ? `<tr><td style="color:#6B7280; padding:4px 0;">Total</td><td style="text-align:right; font-weight:600;">BHD ${amount}</td></tr>` : ""}
            <tr><td style="color:#6B7280; padding:4px 0;">Payment</td><td style="text-align:right;">${details.paymentMethod === "cash" ? "Cash" : "Card"}</td></tr>
          </table>
          ${qrUrl ? `
            <div style="text-align:center; margin: 20px 0; padding: 16px; background:#F7F6F3; border-radius: 12px;">
              <p style="font-size: 13px; color:#6B7280; margin: 0 0 10px 0;">Pay via BenefitPay</p>
              <img src="${qrUrl}" alt="BenefitPay QR code" style="max-width: 160px; border-radius: 8px;" />
            </div>
          ` : ""}
          <p style="color:#6B7280; font-size:13px; margin-top:24px;">Thank you for choosing ${businessName}, sent via Luupa.</p>
        </div>
      `,
    });
    return { sent: true };
  } catch (err) {
    console.error("Failed to send invoice email:", err);
    return { sent: false, reason: "send_failed" };
  }
}
