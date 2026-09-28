import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeWhatsAppNumber } from "@/lib/validation";

// Edits an existing staff member. Every edit goes through here (never a
// plain client-side supabase.from("staff").update()) so the server always
// re-checks auth_user_id/phone fresh instead of a client trusting
// potentially-stale state to decide whether a phone change needs to touch
// Supabase Auth too — see the phone-desync handling below, which exists
// specifically to prevent a repeat of the "PIN doesn't match" bug: editing a
// staff member's phone must never let staff.phone and their linked Supabase
// Auth user's phone drift apart, since signInWithPassword uses the latter.
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
    .select("id, phone, auth_user_id, businesses(owner_id)")
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
  const oldPhone = staffRow.phone ? normalizeWhatsAppNumber(staffRow.phone) : null;
  const phoneChanged = newPhone !== oldPhone;

  if (staffRow.auth_user_id && phoneChanged && !newPhone) {
    return NextResponse.json(
      { error: "Can't remove the phone number for a staff member who already has a login PIN." },
      { status: 400 }
    );
  }

  // Auth update FIRST: if it fails (e.g. that phone is already registered to
  // a different Supabase Auth user), the staff row is left untouched instead
  // of drifting out of sync with auth.users — the reverse-but-equally-bad
  // version of the original bug.
  if (staffRow.auth_user_id && phoneChanged && newPhone) {
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(staffRow.auth_user_id, {
      phone: newPhone,
      phone_confirm: true,
    });
    if (authUpdateError) {
      return NextResponse.json(
        { error: authUpdateError.message || "Couldn't update this staff member's login phone — it may already be in use." },
        { status: 400 }
      );
    }
  }

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
