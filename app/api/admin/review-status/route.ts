import { NextRequest, NextResponse } from "next/server";
import { isValidAdminSession } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_STATUSES = ["visible", "hidden"];

export async function POST(req: NextRequest) {
  if (!(await isValidAdminSession())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { reviewId, status } = await req.json();
  if (!reviewId || !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // recompute_business_rating_trigger (migration-v28.sql) fires on this
  // update automatically — rating_avg/review_count need nothing extra here.
  const { error } = await supabaseAdmin.from("reviews").update({ status }).eq("id", reviewId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
