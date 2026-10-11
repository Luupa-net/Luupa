import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { pinToPassword, staffAuthEmail } from "@/lib/staffPin";
import { getRequestUser, isUuid, readJson } from "@/lib/serverAuth";

// Sets or resets a staff member's login PIN. Staff sign in through
// /api/staff-login with phone + PIN — a real Supabase Auth session, same as
// owners get with email+password, just under a synthetic internal email
// rather than their real phone (see staffAuthEmail() for why). Supabase
// hashes and stores the derived password itself; nothing custom to manage.
export async function POST(req: NextRequest) {
  // SECURITY: require a real logged-in session, then confirm it's the owner
  // of the business the target staff row belongs to. Without this, anyone
  // could set a PIN on any staff row.
  const auth = await getRequestUser(req);
  if (!auth) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await readJson<{ staffId?: unknown; pin?: unknown }>(req);
  const staffId = body?.staffId;
  const pin = body?.pin;
  if (!isUuid(staffId) || typeof pin !== "string" || !/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be 6 digits." }, { status: 400 });
  }

  const { data: staffRow, error: staffError } = await supabaseAdmin
    .from("staff")
    .select("id, phone, auth_user_id, businesses(owner_id)")
    .eq("id", staffId)
    .maybeSingle();
  if (staffError || !staffRow) {
    return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
  }
  const business = Array.isArray(staffRow.businesses) ? staffRow.businesses[0] : staffRow.businesses;
  if (!business || business.owner_id !== auth.user.id) {
    return NextResponse.json({ error: "Not authorized for this staff member." }, { status: 403 });
  }
  if (!staffRow.phone) {
    return NextResponse.json({ error: "Add a phone number for this staff member first." }, { status: 400 });
  }

  const password = pinToPassword(pin, staffRow.id);

  if (staffRow.auth_user_id) {
    // Also lifts a ban left by a previous removal (see staff-remove), in case
    // the same row was restored.
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(staffRow.auth_user_id, { password, ban_duration: "none" });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
    // An owner resetting the PIN is vouching for this staff member — clear
    // any lockout from app/api/staff-login/route.ts so it doesn't stay stuck
    // after they've just proven who they are.
    await supabaseAdmin.from("staff").update({ failed_pin_attempts: 0, locked_until: null }).eq("id", staffRow.id);
    return NextResponse.json({ ok: true, created: false, authUserId: staffRow.auth_user_id });
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: staffAuthEmail(staffRow.id),
    password,
    email_confirm: true,
    user_metadata: { staff_id: staffRow.id },
  });
  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message || "Couldn't create staff login." }, { status: 400 });
  }

  const { error: linkError } = await supabaseAdmin
    .from("staff")
    .update({ auth_user_id: created.user.id, failed_pin_attempts: 0, locked_until: null })
    .eq("id", staffRow.id);
  if (linkError) {
    // Don't leave an orphaned login behind that the row doesn't point to.
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: linkError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, created: true, authUserId: created.user.id });
}
