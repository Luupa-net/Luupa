import { NextRequest, NextResponse } from "next/server";
import { getRequestUser, isUuid, readJson, siteUrl } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendBookingStatusCustomerEmail, type CustomerStatusUpdate } from "@/lib/email";

const NOTIFY_ON: CustomerStatusUpdate[] = ["confirmed", "declined", "cancelled"];

// Called by the bookings board right after an owner or staff member moves a
// booking to confirmed / declined / cancelled: the customer gets an email
// instead of having to check back. The status is read from the database (not
// trusted from the request), and customer_notified_status is claimed
// atomically first, so a double click or two open tabs can't send twice.
export async function POST(req: NextRequest) {
  const auth = await getRequestUser(req);
  if (!auth) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const body = await readJson<{ bookingId?: unknown }>(req);
  if (!isUuid(body?.bookingId)) return NextResponse.json({ error: "Invalid booking." }, { status: 400 });

  const { data: b } = await supabaseAdmin
    .from("bookings")
    .select("id, business_id, status, customer_name, customer_email, service, preferred_date, preferred_time, customer_notified_status, businesses(name, owner_id, phone, whatsapp)")
    .eq("id", body!.bookingId)
    .maybeSingle();
  const biz: any = b ? (Array.isArray(b.businesses) ? b.businesses[0] : b.businesses) : null;
  if (!b || !biz) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  // Owner, or an active staff member of this business.
  let allowed = biz.owner_id === auth.user.id;
  if (!allowed) {
    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select("id")
      .eq("business_id", b.business_id)
      .eq("auth_user_id", auth.user.id)
      .eq("active", true)
      .maybeSingle();
    allowed = !!staff;
  }
  if (!allowed) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  const status = b.status as CustomerStatusUpdate;
  if (!NOTIFY_ON.includes(status)) return NextResponse.json({ status: "skipped" });
  if (!b.customer_email) return NextResponse.json({ status: "no_email" });
  if (b.customer_notified_status === status) return NextResponse.json({ status: "already_sent" });

  const previous = b.customer_notified_status as string | null;
  let claim = supabaseAdmin.from("bookings").update({ customer_notified_status: status }).eq("id", b.id);
  claim = previous ? claim.eq("customer_notified_status", previous) : claim.is("customer_notified_status", null);
  const { data: claimed } = await claim.select("id");
  if (!claimed || claimed.length === 0) return NextResponse.json({ status: "already_sent" });

  const base = siteUrl(req);
  const result = await sendBookingStatusCustomerEmail(b.customer_email, status, {
    businessName: biz.name,
    customerName: b.customer_name || "there",
    service: b.service,
    date: b.preferred_date
      ? new Date(`${b.preferred_date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
      : null,
    time: b.preferred_time,
    businessPhone: biz.phone,
    businessWhatsapp: biz.whatsapp,
    listingUrl: `${base}/listing/${b.business_id}`,
  });
  if (!result.sent) {
    // Release the claim so a retry can still go out.
    await supabaseAdmin.from("bookings").update({ customer_notified_status: previous }).eq("id", b.id);
    return NextResponse.json({ status: result.reason });
  }
  return NextResponse.json({ status: "sent" });
}
