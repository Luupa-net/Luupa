import { NextRequest, NextResponse } from "next/server";
import { getRequestUser, isUuid, readJson } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Owners can't delete reviews — that would make every rating on Luupa
// meaningless. What they CAN do is flag one (fake, abusive, wrong business)
// for Luupa's admin to look at; admin decides whether to hide it.
const REASONS = ["fake", "abusive", "wrong_business", "personal_info", "other"] as const;

export async function POST(req: NextRequest) {
  const auth = await getRequestUser(req);
  if (!auth) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const body = await readJson<{ reviewId?: unknown; reason?: unknown; details?: unknown }>(req);
  if (!body || !isUuid(body.reviewId)) return NextResponse.json({ error: "Invalid review." }, { status: 400 });
  const reason = REASONS.includes(body.reason as any) ? (body.reason as string) : null;
  if (!reason) return NextResponse.json({ error: "Choose a reason." }, { status: 400 });
  const details = typeof body.details === "string" ? body.details.trim().slice(0, 400) : "";

  const { data: review } = await supabaseAdmin
    .from("reviews")
    .select("id, reported_at, businesses(owner_id)")
    .eq("id", body.reviewId)
    .maybeSingle();
  const biz: any = review ? (Array.isArray(review.businesses) ? review.businesses[0] : review.businesses) : null;
  if (!review || biz?.owner_id !== auth.user.id) return NextResponse.json({ error: "Review not found." }, { status: 404 });
  if (review.reported_at) return NextResponse.json({ ok: true, alreadyReported: true });

  const { error } = await supabaseAdmin
    .from("reviews")
    .update({ reported_at: new Date().toISOString(), report_reason: `${reason}${details ? `: ${details}` : ""}` })
    .eq("id", review.id)
    .is("reported_at", null);
  if (error) return NextResponse.json({ error: "Couldn't send that report — try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
