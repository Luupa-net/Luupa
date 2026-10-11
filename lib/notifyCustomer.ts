"use client";

import { supabase } from "@/lib/supabase";

const NOTIFY_ON = ["confirmed", "declined", "cancelled"];

// Fire-and-forget: tell the customer about a status change the business just
// saved. The server re-reads the real status and dedupes, so calling this
// for any status change is safe.
export async function notifyCustomerOfStatus(bookingId: string, status: unknown) {
  if (typeof status !== "string" || !NOTIFY_ON.includes(status)) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  fetch("/api/bookings/notify-customer", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ bookingId }),
    keepalive: true,
  }).catch(() => {});
}
