import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendInvoiceEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  // SECURITY: require a real logged-in session token, not just any request —
  // otherwise this endpoint could be used as a free, anonymous email relay.
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { bookingId, vehicle, amount, paymentMethod, qrUrl } = await req.json();

  if (!bookingId || !["cash", "card", "benefit"].includes(paymentMethod)) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  // SECURITY: never trust a client-supplied recipient/customer name/business
  // name — look the booking up server-side (service role, bypasses RLS so we
  // can do the ownership check ourselves) and confirm it belongs to a
  // business owned by the authenticated caller. This is what stops any
  // authenticated account from emailing an arbitrary address or impersonating
  // a customer/business it doesn't own.
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .select("customer_name, customer_email, service, business_id, businesses(owner_id, name)")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const business = Array.isArray(booking.businesses) ? booking.businesses[0] : booking.businesses;
  if (!business || business.owner_id !== user.id) {
    return NextResponse.json({ error: "Not authorized for this booking." }, { status: 403 });
  }

  if (!booking.customer_email) {
    return NextResponse.json({ error: "This booking has no customer email on file." }, { status: 400 });
  }

  const result = await sendInvoiceEmail(booking.customer_email, {
    businessName: business.name,
    customerName: booking.customer_name,
    service: booking.service,
    vehicle,
    amount,
    paymentMethod,
    qrUrl,
  });
  return NextResponse.json(result);
}
