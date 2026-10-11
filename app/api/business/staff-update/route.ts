import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeWhatsAppNumber } from "@/lib/validation";
import { getRequestUser, isUuid, readJson } from "@/lib/serverAuth";

// Edits an existing staff member. Every edit goes through here (never a
// plain client-side supabase.from("staff").update()) so the server always
// re-checks ownership fresh rather than trusting a client's local state.
//
// staff.phone is a pure contact field, decoupled from the staff member's
// Supabase Auth identity (a synthetic email derived from staff.id — see
// staffAuthEmail() in lib/staffPin.ts) — so changing it here never needs to
// touch Supabase Auth at all.
function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

export async function POST(req: NextRequest) {
  const auth = await getRequestUser(req);
  if (!auth) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await readJson<{ staffId?: unknown; name?: unknown; role?: unknown; phone?: unknown; nationalId?: unknown }>(req);
  const name = text(body?.name, 120);
  if (!isUuid(body?.staffId) || !name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  const staffId = body!.staffId as string;

  const { data: staffRow, error: staffError } = await supabaseAdmin
    .from("staff")
    .select("id, businesses(owner_id)")
    .eq("id", staffId)
    .maybeSingle();
  if (staffError || !staffRow) {
    return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
  }
  const business = Array.isArray(staffRow.businesses) ? staffRow.businesses[0] : staffRow.businesses;
  if (!business || business.owner_id !== auth.user.id) {
    return NextResponse.json({ error: "Not authorized for this staff member." }, { status: 403 });
  }

  const rawPhone = text(body?.phone, 32);
  // A bare country code ("973") means the number field was left empty.
  const digits = rawPhone ? normalizeWhatsAppNumber(rawPhone) : "";
  const newPhone = digits.length >= 8 ? digits : null;

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("staff")
    .update({ name, role: text(body?.role, 60), phone: newPhone, national_id: text(body?.nationalId, 32) })
    .eq("id", staffId)
    .select()
    .single();
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, staff: updated });
}
