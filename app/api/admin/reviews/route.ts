import { NextResponse } from "next/server";
import { isValidAdminSession } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// reviews_public (migration-v28.sql) filters to status='visible' only — it
// can never show admin a hidden row to restore. This is the only read path
// that can, so moderation's "restore" action stays reachable at all.
export async function GET() {
  if (!(await isValidAdminSession())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("reviews")
    .select("id, business_id, rating, body, author_name, status, owner_reply, owner_replied_at, created_at, businesses(name)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reviews: data });
}
