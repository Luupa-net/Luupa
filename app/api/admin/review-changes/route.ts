import { NextRequest, NextResponse } from "next/server";
import { isValidAdminSession } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PUBLIC_FIELDS } from "@/lib/businessFields";

export async function POST(req: NextRequest) {
  if (!(await isValidAdminSession())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { businessId, action } = await req.json();

  if (!businessId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (action === "reject") {
    // Just discard the draft — the currently-approved version stays as-is
    const { error } = await supabaseAdmin
      .from("businesses")
      .update({ pending_changes: null })
      .eq("id", businessId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Approve — merge the pending fields into the live row, then clear the draft
  const { data: business, error: fetchError } = await supabaseAdmin
    .from("businesses")
    .select("pending_changes")
    .eq("id", businessId)
    .single();

  if (fetchError || !business?.pending_changes) {
    return NextResponse.json({ error: "No pending changes found." }, { status: 400 });
  }

  // SECURITY: only pull whitelisted, customer-facing keys out of the draft —
  // a business writes pending_changes themselves (that's how they submit an
  // edit), so it must never be trusted wholesale. Anything outside this list
  // (e.g. a snuck-in "verified" or "status" key) is silently dropped here.
  const safeUpdate: Record<string, any> = {};
  for (const field of PUBLIC_FIELDS) {
    if (field in business.pending_changes) {
      safeUpdate[field] = business.pending_changes[field];
    }
  }
  safeUpdate.pending_changes = null;

  const { error: updateError } = await supabaseAdmin
    .from("businesses")
    .update(safeUpdate)
    .eq("id", businessId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
