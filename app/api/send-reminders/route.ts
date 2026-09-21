import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendReminderEmail } from "@/lib/email";

// Bahrain has no DST and is UTC+3 year-round, so "preferred_date + preferred_time"
// (always Bahrain local time) can be converted to a real UTC instant with a fixed
// offset — no timezone library needed.
const BAHRAIN_OFFSET_HOURS = 3;

// Vercel's Hobby plan only allows a cron to run once per day (see vercel.json —
// this runs once daily at 06:00 UTC / 09:00 Bahrain), so reminders are sent by
// calendar date rather than a precise "N hours before" window: every booking
// whose preferred_date is tomorrow (Bahrain-local) gets exactly one reminder
// on today's run, regardless of what time of day the appointment itself is.

// Vercel attaches `Authorization: Bearer $CRON_SECRET` to its own scheduled
// calls when a CRON_SECRET env var exists on the project — this is what
// stops this route from being triggered by anyone else.
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;

  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on mismatched lengths rather than returning
  // false, so check that first.
  if (a.length !== b.length) return false;

  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Bahrain-local calendar date (YYYY-MM-DD) for a given instant.
function bahrainDateKey(d: Date): string {
  const shifted = new Date(d.getTime() + BAHRAIN_OFFSET_HOURS * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function formatDateHuman(preferredDate: string): string {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(preferredDate);
  if (!dateMatch) return preferredDate;
  const [, y, mo, d] = dateMatch;
  const asUtc = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  return asUtc.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatTimeHuman(preferredTime: string): string {
  const timeMatch = /^(\d{2}):(\d{2})/.exec(preferredTime);
  if (!timeMatch) return preferredTime;
  const [, hStr, minStr] = timeMatch;
  const h = Number(hStr);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${minStr} ${period}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const now = new Date();
  const tomorrowKey = bahrainDateKey(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  const { data: candidates, error } = await supabaseAdmin
    .from("bookings")
    .select("id, customer_name, customer_email, service, preferred_date, preferred_time, businesses(name, phone, whatsapp)")
    .eq("status", "confirmed")
    .eq("preferred_date", tomorrowKey)
    .is("reminder_sent_at", null)
    .not("customer_email", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let checked = 0;
  let sent = 0;
  let failed = 0;

  for (const booking of candidates || []) {
    checked++;

    if (!booking.preferred_date || !booking.customer_email) continue;

    try {
      // Conditional claim: only proceed if this invocation is the one that
      // flips reminder_sent_at from null. If another (overlapping/retried)
      // run already claimed it, `claimed` comes back empty and we skip.
      const { data: claimed, error: claimError } = await supabaseAdmin
        .from("bookings")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", booking.id)
        .is("reminder_sent_at", null)
        .select();

      if (claimError) {
        console.error("Failed to claim booking for reminder:", booking.id, claimError);
        failed++;
        continue;
      }
      if (!claimed || claimed.length === 0) continue;

      const business = Array.isArray(booking.businesses) ? booking.businesses[0] : booking.businesses;

      const result = await sendReminderEmail(booking.customer_email, {
        businessName: business?.name || "your service provider",
        customerName: booking.customer_name,
        service: booking.service,
        date: formatDateHuman(booking.preferred_date),
        time: booking.preferred_time ? formatTimeHuman(booking.preferred_time) : "the scheduled time",
        whatsapp: business?.whatsapp,
        phone: business?.phone,
      });

      if (result.sent) {
        sent++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error("Failed to process reminder for booking:", booking.id, err);
      failed++;
    }
  }

  return NextResponse.json({ checked, sent, failed });
}
