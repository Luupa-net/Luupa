import { NextRequest, NextResponse } from "next/server";
import { getRequestUser, isUuid, siteUrl } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { receiptUrlFor } from "@/lib/bookingDispatch";

// "View receipt" from My bookings: the signed receipt link for a paid
// booking that belongs to the signed-in customer.
export async function GET(req: NextRequest) {
  const auth = await getRequestUser(req);
  if (!auth) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const bookingId = req.nextUrl.searchParams.get("bookingId");
  if (!isUuid(bookingId)) return NextResponse.json({ error: "Invalid booking." }, { status: 400 });

  const { data: b } = await supabaseAdmin.from("bookings").select("id, customer_id, paid").eq("id", bookingId).maybeSingle();
  if (!b || b.customer_id !== auth.user.id) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  if (!b.paid) return NextResponse.json({ error: "There's no receipt for this booking yet." }, { status: 400 });
  return NextResponse.json({ url: receiptUrlFor(siteUrl(req), b.id) });
}
