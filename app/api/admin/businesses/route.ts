import { NextResponse } from "next/server";
import { isValidAdminSession } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  if (!(await isValidAdminSession())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const [{ data, error }, { data: users }] = await Promise.all([
    supabaseAdmin.from("businesses").select("*").order("created_at", { ascending: false }),
    // Owner emails, so admin can reach an applicant straight from their card.
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const emailById = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? null]));
  const businesses = (data ?? []).map((b) => ({ ...b, owner_email: emailById.get(b.owner_id) ?? null }));
  return NextResponse.json({ businesses });
}
