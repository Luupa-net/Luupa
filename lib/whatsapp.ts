import { normalizeWhatsAppNumber } from "@/lib/validation";
import { formatBhd } from "@/lib/money";
import type { ReceiptData } from "@/lib/receipt";

// Fully automatic WhatsApp receipts need Meta's WhatsApp Business Cloud API:
// a verified business number + an approved message template (WhatsApp does
// not allow businesses to send free-form messages to customers who haven't
// messaged them in the last 24h). Until those env vars are set this reports
// "not_configured" and the dashboard falls back to opening a pre-filled
// wa.me chat automatically — one tap on "Send" for the owner.
//
// Template expected (create it in Meta Business Manager, category UTILITY):
//   name: WHATSAPP_RECEIPT_TEMPLATE (default "luupa_receipt"), language WHATSAPP_TEMPLATE_LANG (default "en")
//   body: "Hi {{1}}, thanks for visiting {{2}}! Total paid: {{3}}. Your receipt: {{4}}"
export function whatsappConfigured(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export async function sendWhatsAppReceipt(r: ReceiptData, receiptUrl: string): Promise<{ sent: boolean; reason?: string }> {
  if (!whatsappConfigured()) return { sent: false, reason: "not_configured" };
  if (!r.customerContact) return { sent: false, reason: "no_number" };
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizeWhatsAppNumber(r.customerContact),
        type: "template",
        template: {
          name: process.env.WHATSAPP_RECEIPT_TEMPLATE || "luupa_receipt",
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: r.customerName.split(" ")[0].slice(0, 60) || "there" },
                { type: "text", text: r.businessName.slice(0, 60) },
                { type: "text", text: formatBhd(r.total) },
                { type: "text", text: receiptUrl },
              ],
            },
          ],
        },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("WhatsApp receipt failed:", res.status, await res.text().catch(() => ""));
      return { sent: false, reason: "send_failed" };
    }
    return { sent: true };
  } catch (err) {
    console.error("WhatsApp receipt failed:", err);
    return { sent: false, reason: "send_failed" };
  }
}
