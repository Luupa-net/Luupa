import { NextRequest, NextResponse } from "next/server";
import { getRequestUser, isUuid } from "@/lib/serverAuth";
import { loadReceipt, type ReceiptData } from "@/lib/receipt";

// Shared gate for owner-only booking actions: a real session, a well-formed
// id, and the booking's business must belong to the caller. Returns either
// the loaded receipt data or a ready-to-return error response.
export async function authorizeOwnerBooking(
  req: NextRequest,
  bookingId: unknown
): Promise<{ receipt: ReceiptData; userId: string } | { error: NextResponse }> {
  const auth = await getRequestUser(req);
  if (!auth) return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  if (!isUuid(bookingId)) return { error: NextResponse.json({ error: "Invalid booking." }, { status: 400 }) };
  const receipt = await loadReceipt(bookingId);
  // Same response for "doesn't exist" and "not yours" — no probing other
  // businesses' booking ids.
  if (!receipt || receipt.ownerId !== auth.user.id) {
    return { error: NextResponse.json({ error: "Booking not found." }, { status: 404 }) };
  }
  return { receipt, userId: auth.user.id };
}
