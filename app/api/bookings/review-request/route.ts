import { NextRequest, NextResponse } from "next/server";
import { readJson, siteUrl } from "@/lib/serverAuth";
import { authorizeOwnerBooking } from "@/lib/ownerBooking";
import { emailReviewRequest } from "@/lib/bookingDispatch";

// "Send review request" from the Payment tab — immediate, owner only, and
// at most once per 12h per booking (and never once they've reviewed).
export async function POST(req: NextRequest) {
  const body = await readJson<{ bookingId?: unknown }>(req);
  const gate = await authorizeOwnerBooking(req, body?.bookingId);
  if ("error" in gate) return gate.error;
  const result = await emailReviewRequest(gate.receipt, siteUrl(req), { delayMinutes: 0, allowResend: true });
  const ok = result.status === "sent" || result.status === "scheduled";
  return NextResponse.json(result, { status: ok ? 200 : result.status === "too_soon" ? 429 : 400 });
}
