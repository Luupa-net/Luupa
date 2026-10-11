import { NextRequest, NextResponse } from "next/server";
import { isValidAdminSession } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isUuid } from "@/lib/serverAuth";

const ALLOWED_STATUSES = ["visible", "hidden"];

export async function POST(req: NextRequest) {
  if (!(await isValidAdminSession())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: { reviewId?: unknown; status?: unknown; dismissReport?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { reviewId, status, dismissReport } = body;
  if (!isUuid(reviewId) || (!dismissReport && !ALLOWED_STATUSES.includes(status as string))) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Either decision closes an owner's report: hiding upholds it, restoring
  // or "keep visible" dismisses it.
  const changes: Record<string, unknown> = { reported_at: null, report_reason: null };
  if (!dismissReport) changes.status = status;

  // recompute_business_rating_trigger (migration-v28.sql) fires on this
  // update automatically — rating_avg/review_count need nothing extra here.
  const { error } = await supabaseAdmin.from("reviews").update(changes).eq("id", reviewId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
