import { NextRequest, NextResponse, after } from "next/server";
import { getRequestUser, isUuid, readJson, siteUrl, userScopedClient } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendBookingCancelledOwnerEmail } from "@/lib/email";

// A customer cancelling their own upcoming booking from "My bookings". The
// cancel itself runs AS the customer through cancel_my_booking()
// (migration-v30), which enforces ownership and that it's still
// pending/confirmed. The owner's board updates live via Realtime; this also
// emails them so a freed-up slot doesn't go unnoticed.
export async function POST(req: NextRequest) {
  const auth = await getRequestUser(req);
  if (!auth) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const body = await readJson<{ bookingId?: unknown }>(req);
  if (!isUuid(body?.bookingId)) return NextResponse.json({ error: "Invalid booking." }, { status: 400 });

  const { data: row, error } = await userScopedClient(auth.token).rpc("cancel_my_booking", { p_booking_id: body!.bookingId });
  if (error || !row) {
    const message = (error?.message || "Couldn't cancel that booking.").replace(/^CANCEL:\s*/, "");
    const status = error?.code === "P0002" ? 404 : error?.code === "42501" ? 403 : 400;
    return NextResponse.json({ error: message.charAt(0).toUpperCase() + message.slice(1) }, { status });
  }

  const base = siteUrl(req);
  after(async () => {
    const { data: b } = await supabaseAdmin
      .from("bookings")
      .select("id, customer_name, service, preferred_date, preferred_time, businesses(name, owner_id)")
      .eq("id", row.id)
      .maybeSingle();
    const biz: any = b ? (Array.isArray(b.businesses) ? b.businesses[0] : b.businesses) : null;
    if (!b || !biz?.owner_id) return;
    const { data: owner } = await supabaseAdmin.auth.admin.getUserById(biz.owner_id);
    if (!owner?.user?.email) return;
    await sendBookingCancelledOwnerEmail(owner.user.email, {
      businessName: biz.name,
      customerName: b.customer_name || "A customer",
      service: b.service,
      date: b.preferred_date
        ? new Date(`${b.preferred_date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
        : null,
      time: b.preferred_time,
      dashboardUrl: `${base}/business/bookings?open=${b.id}`,
    });
  });

  return NextResponse.json({ booking: { id: row.id, status: row.status } });
}
