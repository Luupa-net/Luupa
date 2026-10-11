import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getRequestUser, isUuid, readJson } from "@/lib/serverAuth";

// Removes a staff member AND shuts their login. Deleting only the staff row
// (what the page used to do client-side) left a live Supabase Auth account
// behind that could still sign in. The auth user is banned rather than
// deleted: booking_status_history.changed_by references it, and the
// timeline should keep showing who did what.
export async function POST(req: NextRequest) {
  const auth = await getRequestUser(req);
  if (!auth) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await readJson<{ staffId?: unknown }>(req);
  if (!isUuid(body?.staffId)) return NextResponse.json({ error: "Invalid staff member." }, { status: 400 });
  const staffId = body!.staffId as string;

  const { data: staffRow } = await supabaseAdmin
    .from("staff")
    .select("id, auth_user_id, businesses(owner_id)")
    .eq("id", staffId)
    .maybeSingle();
  const business: any = staffRow ? (Array.isArray(staffRow.businesses) ? staffRow.businesses[0] : staffRow.businesses) : null;
  if (!staffRow || business?.owner_id !== auth.user.id) {
    return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
  }

  if (staffRow.auth_user_id) {
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(staffRow.auth_user_id, { ban_duration: "876000h" });
    if (banError) return NextResponse.json({ error: "Couldn't disable their login — try again." }, { status: 500 });
  }

  // bookings.assigned_staff_id is ON DELETE SET NULL (migration-v21c).
  const { error } = await supabaseAdmin.from("staff").delete().eq("id", staffRow.id);
  if (error) return NextResponse.json({ error: "Couldn't remove them — try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
