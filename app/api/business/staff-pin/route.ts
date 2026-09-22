import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeWhatsAppNumber } from "@/lib/validation";
import { pinToPassword } from "@/lib/staffPin";

// Sets or resets a staff member's login PIN. Staff sign in with
// supabase.auth.signInWithPassword({ phone, password: pin }) — a real
// Supabase Auth session, same as owners get with email+password. Supabase
// hashes and stores the PIN itself; nothing custom to manage here.
export async function POST(req: NextRequest) {
  // SECURITY: require a real logged-in session, then confirm it's the owner
  // of the business the target staff row belongs to — same pattern as
  // /api/send-invoice. Without this, anyone could set a PIN on any staff row.
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { staffId, pin } = await req.json();
  if (!staffId || typeof pin !== "string" || !/^\d{4,6}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be 4-6 digits." }, { status: 400 });
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
  if (!staffRow.phone) {
    return NextResponse.json({ error: "Add a phone number for this staff member first." }, { status: 400 });
  }

  const phone = normalizeWhatsAppNumber(staffRow.phone);
  const password = pinToPassword(pin);

  if (staffRow.auth_user_id) {
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(staffRow.auth_user_id, { password });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, created: false, authUserId: staffRow.auth_user_id });
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    phone,
    password,
    phone_confirm: true,
    user_metadata: { staff_id: staffRow.id },
  });
  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message || "Couldn't create staff login." }, { status: 400 });
  }

  const { error: linkError } = await supabaseAdmin
    .from("staff")
    .update({ auth_user_id: created.user.id })
    .eq("id", staffRow.id);
  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, created: true, authUserId: created.user.id });
}
