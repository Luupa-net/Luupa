import { NextRequest, NextResponse } from "next/server";
import { isValidAdminSession } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_STATUSES = ["pending", "active", "suspended"];

export async function POST(req: NextRequest) {
  if (!(await isValidAdminSession())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { businessId, status, verified, verifiedUntil } = await req.json();

  if (!businessId || !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const payload: Record<string, any> = { status, verified: !!verified };

  // Only touch verified_until when the request explicitly sent it (null clears
  // it, a date string sets it) — omitting it entirely leaves the existing
  // value untouched, e.g. for a plain Approve or Move-to-pending action.
  if (verifiedUntil !== undefined) {
    if (verifiedUntil !== null && isNaN(new Date(verifiedUntil).getTime())) {
      return NextResponse.json({ error: "Invalid verifiedUntil date." }, { status: 400 });
    }
    payload.verified_until = verifiedUntil;
  }

  const { error } = await supabaseAdmin
    .from("businesses")
    .update(payload)
    .eq("id", businessId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
