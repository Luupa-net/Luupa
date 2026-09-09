import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = "Luupa <hello@luupa.net>";

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
