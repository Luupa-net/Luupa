import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeWhatsAppNumber } from "@/lib/validation";

// Edits an existing staff member. Every edit goes through here (never a
// plain client-side supabase.from("staff").update()) so the server always
// re-checks ownership fresh rather than trusting a client's local state.
//
// staff.phone is a pure contact field, decoupled from the staff member's
// Supabase Auth identity (a synthetic email derived from staff.id — see
// staffAuthEmail() in lib/staffPin.ts) — so changing it here never needs to
// touch Supabase Auth at all.
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

  const { staffId, name, role, phone, nationalId } = await req.json();
  if (!staffId || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const { data: staffRow, error: staffError } = await supabaseAdmin
    .from("staff")
    .select("id, businesses(owner_id)")
    .eq("id", staffId)
    .single();
  if (staffError || !staffRow) {
    return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
  }
  const business = Array.isArray(staffRow.businesses) ? staffRow.businesses[0] : staffRow.businesses;
  if (!business || business.owner_id !== user.id) {
    return NextResponse.json({ error: "Not authorized for this staff member." }, { status: 403 });
  }

  const newPhone = phone ? normalizeWhatsAppNumber(phone) : null;

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("staff")
    .update({ name: name.trim(), role: role || null, phone: newPhone, national_id: nationalId || null })
    .eq("id", staffId)
    .select()
    .single();
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, staff: updated });
}
