import { NextRequest, NextResponse } from "next/server";
import { isValidAdminSession } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_STATUSES = ["pending", "active", "suspended"];

export async function POST(req: NextRequest) {
  if (!isValidAdminSession()) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { businessId, status, verified } = await req.json();

  if (!businessId || !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("businesses")
    .update({ status, verified: !!verified })
    .eq("id", businessId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
