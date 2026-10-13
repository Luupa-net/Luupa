import { NextRequest, NextResponse } from "next/server";
import { isValidAdminSession } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isUuid, readJson } from "@/lib/serverAuth";

// Contact form inbox (contact_messages, migration-v32). Service role only —
// the table has no RLS policies, so this is the only way to read it.
export async function GET() {
  if (!(await isValidAdminSession())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("contact_messages")
    .select("id, name, phone, email, role, topic, car, message, emailed, handled_at, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data });
}

// Mark a message handled (or back to open).
export async function POST(req: NextRequest) {
  if (!(await isValidAdminSession())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const body = await readJson<{ messageId?: unknown; handled?: unknown }>(req);
  if (!isUuid(body?.messageId) || typeof body?.handled !== "boolean") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("contact_messages")
    .update({ handled_at: body.handled ? new Date().toISOString() : null })
    .eq("id", body.messageId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
