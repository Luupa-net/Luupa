import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { reviewId, reply } = await req.json();
  if (!reviewId || typeof reply !== "string" || !reply.trim() || reply.length > 2000) {
    return NextResponse.json({ error: "Reply must be between 1 and 2000 characters." }, { status: 400 });
  }

  const { data: reviewRow, error: reviewError } = await supabaseAdmin
    .from("reviews")
    .select("id, owner_replied_at, businesses(owner_id)")
    .eq("id", reviewId)
    .single();
  if (reviewError || !reviewRow) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }
  const business = Array.isArray(reviewRow.businesses) ? reviewRow.businesses[0] : reviewRow.businesses;
  if (!business || business.owner_id !== user.id) {
    return NextResponse.json({ error: "Not authorized for this review." }, { status: 403 });
  }
  if (reviewRow.owner_replied_at) {
    return NextResponse.json({ error: "You've already replied to this review." }, { status: 400 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("reviews")
    .update({ owner_reply: reply.trim(), owner_replied_at: new Date().toISOString() })
    .eq("id", reviewId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
