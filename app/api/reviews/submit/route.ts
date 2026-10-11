import { NextRequest, NextResponse } from "next/server";
import { getRequestUser, isUuid, readJson } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyBookingLink } from "@/lib/signedLink";

// Backs the /review/[bookingId] page that review-request emails link to.
//
// Who may review a booking:
//   - the Luupa customer it already belongs to (customer_id = caller), or
//   - for a walk-in/manual booking with no customer account attached yet,
//     whoever holds the signed link from the review email (proof they got
//     that email) — the booking is then attached to their account, so it
//     also shows up under "My bookings".
// Always: the booking must be completed, and one review per booking.

type Loaded = {
  id: string;
  business_id: string;
  customer_id: string | null;
  status: string;
  service: string | null;
  preferred_date: string | null;
  businesses: { name: string; logo_url: string | null } | { name: string; logo_url: string | null }[] | null;
};

async function loadAndAuthorize(req: NextRequest, bookingId: unknown, token: unknown) {
  const auth = await getRequestUser(req);
  if (!auth) return { error: NextResponse.json({ error: "Please sign in to leave a review." }, { status: 401 }) };
  if (!isUuid(bookingId)) return { error: NextResponse.json({ error: "This review link isn't valid." }, { status: 400 }) };

  const { data: b } = await supabaseAdmin
    .from("bookings")
    .select("id, business_id, customer_id, status, service, preferred_date, businesses(name, logo_url)")
    .eq("id", bookingId)
    .maybeSingle<Loaded>();
  const hasValidLink = verifyBookingLink("review", String(bookingId), typeof token === "string" ? token : null);

  if (!b) return { error: NextResponse.json({ error: "This review link isn't valid." }, { status: 404 }) };
  const isOwnBooking = b.customer_id === auth.user.id;
  const canClaim = !b.customer_id && hasValidLink;
  if (!isOwnBooking && !canClaim) {
    // Only someone holding the genuine emailed link learns that the booking
    // exists under another account — anyone else gets the same answer as
    // for a booking id that doesn't exist at all.
    return {
      error:
        hasValidLink && b.customer_id
          ? NextResponse.json({ error: "This booking belongs to a different Luupa account — sign in with the account you booked with." }, { status: 403 })
          : NextResponse.json({ error: "This review link isn't valid." }, { status: 404 }),
    };
  }
  return { auth, booking: b, canClaim };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const result = await loadAndAuthorize(req, sp.get("bookingId"), sp.get("t"));
  if ("error" in result) return result.error;
  const { booking } = result;
  const biz = Array.isArray(booking.businesses) ? booking.businesses[0] : booking.businesses;
  const { data: existing } = await supabaseAdmin
    .from("reviews")
    .select("id, rating, body, owner_reply")
    .eq("booking_id", booking.id)
    .maybeSingle();
  return NextResponse.json({
    businessId: booking.business_id,
    businessName: biz?.name ?? "this business",
    businessLogo: biz?.logo_url ?? null,
    service: booking.service,
    date: booking.preferred_date,
    completed: booking.status === "completed",
    existing,
  });
}

export async function POST(req: NextRequest) {
  const body = await readJson<{ bookingId?: unknown; t?: unknown; rating?: unknown; body?: unknown }>(req);
  const result = await loadAndAuthorize(req, body?.bookingId, body?.t);
  if ("error" in result) return result.error;
  const { auth, booking, canClaim } = result;

  const rating = Number(body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Choose a rating from 1 to 5 stars." }, { status: 400 });
  }
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (text.length > 2000) return NextResponse.json({ error: "Keep your review under 2000 characters." }, { status: 400 });
  if (booking.status !== "completed") {
    return NextResponse.json({ error: "You can review this visit once the business marks it completed." }, { status: 400 });
  }

  // The reviewer needs a customer profile (the review's author name comes
  // from it, and bookings.customer_id references it).
  const { data: customer } = await supabaseAdmin.from("customers").select("id").eq("id", auth.user.id).maybeSingle();
  if (!customer) {
    const meta = (auth.user.user_metadata || {}) as Record<string, unknown>;
    const { error: custErr } = await supabaseAdmin.from("customers").insert({
      id: auth.user.id,
      name: String(meta.full_name || meta.name || auth.user.email?.split("@")[0] || "Customer").slice(0, 120),
      email: auth.user.email ?? null,
      phone: String(meta.phone || "").slice(0, 32),
    });
    if (custErr && custErr.code !== "23505") return NextResponse.json({ error: "Couldn't set up your profile — try again." }, { status: 500 });
  }

  if (canClaim) {
    // Atomic: only attaches if still unclaimed, so two people with the same
    // forwarded link can't both end up owning it.
    const { data: attached } = await supabaseAdmin
      .from("bookings")
      .update({ customer_id: auth.user.id })
      .eq("id", booking.id)
      .is("customer_id", null)
      .select("id");
    if (!attached || attached.length === 0) {
      return NextResponse.json({ error: "This booking was already claimed by another account." }, { status: 409 });
    }
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("reviews")
    .insert({
      business_id: booking.business_id,
      booking_id: booking.id,
      customer_id: auth.user.id,
      rating,
      body: text || null,
      status: "visible",
    })
    .select("id, rating, body")
    .single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "You've already reviewed this visit." }, { status: 409 });
    return NextResponse.json({ error: "Couldn't post your review — try again." }, { status: 500 });
  }
  return NextResponse.json({ review: inserted });
}
