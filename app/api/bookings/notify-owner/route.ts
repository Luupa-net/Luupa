import { NextRequest, NextResponse } from "next/server";
import { getRequestUser, isUuid, readJson, siteUrl } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendNewBookingOwnerEmail } from "@/lib/email";

// Fired by the customer's browser right after their booking request is
// saved, so the owner hears about it by email even with the dashboard
// closed. Locked down so it can't be used to spam an owner:
//   - only the customer who made the booking can trigger it,
//   - only for a still-pending Luupa booking created in the last 15 minutes,
//   - and only once (owner_notified_at is claimed atomically).
export async function POST(req: NextRequest) {
  const auth = await getRequestUser(req);
  if (!auth) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const body = await readJson<{ bookingId?: unknown }>(req);
  if (!body || !isUuid(body.bookingId)) return NextResponse.json({ error: "Invalid booking." }, { status: 400 });

  const { data: b } = await supabaseAdmin
    .from("bookings")
    .select("id, customer_id, customer_name, service, preferred_date, preferred_time, vehicle_make, vehicle_model, note, status, source, created_at, owner_notified_at, businesses(name, owner_id)")
    .eq("id", body.bookingId)
    .maybeSingle();
  if (!b || b.customer_id !== auth.user.id) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  if (b.source !== "luupa" || b.status !== "pending" || b.owner_notified_at) return NextResponse.json({ status: "skipped" });
  if (Date.now() - new Date(b.created_at).getTime() > 15 * 60 * 1000) return NextResponse.json({ status: "skipped" });

  const { data: claimed } = await supabaseAdmin
    .from("bookings")
    .update({ owner_notified_at: new Date().toISOString() })
    .eq("id", b.id)
    .is("owner_notified_at", null)
    .select("id");
  if (!claimed || claimed.length === 0) return NextResponse.json({ status: "skipped" });

  const biz: any = Array.isArray(b.businesses) ? b.businesses[0] : b.businesses;
  if (!biz?.owner_id) return NextResponse.json({ status: "skipped" });
  const { data: owner } = await supabaseAdmin.auth.admin.getUserById(biz.owner_id);
  const to = owner?.user?.email;
  if (!to) return NextResponse.json({ status: "no_email" });

  const result = await sendNewBookingOwnerEmail(to, {
    businessName: biz.name,
    customerName: b.customer_name || "A customer",
    service: b.service,
    date: b.preferred_date
      ? new Date(`${b.preferred_date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
      : null,
    time: b.preferred_time,
    vehicle: [b.vehicle_make, b.vehicle_model].filter(Boolean).join(" ") || null,
    note: b.note ? String(b.note).slice(0, 300) : null,
    dashboardUrl: `${siteUrl(req)}/business/bookings?open=${b.id}`,
  });
  return NextResponse.json({ status: result.sent ? "sent" : result.reason });
}
