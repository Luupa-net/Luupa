import { NextRequest, NextResponse } from "next/server";
import { isValidAdminSession } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendApprovalEmail, sendVerifiedEmail } from "@/lib/email";

const ALLOWED_STATUSES = ["pending", "active", "suspended"];

export async function POST(req: NextRequest) {
  if (!(await isValidAdminSession())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { businessId, status, verified, verifiedUntil } = await req.json();

  if (!businessId || !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Fetch the current state first, so we can tell what actually changed —
  // an email should only fire on a real transition, not every save
  const { data: before } = await supabaseAdmin
    .from("businesses")
    .select("owner_id, name, status, verified")
    .eq("id", businessId)
    .single();

  const payload: Record<string, any> = { status, verified: !!verified };

  if (verifiedUntil !== undefined) {
    if (verifiedUntil !== null && isNaN(new Date(verifiedUntil).getTime())) {
      return NextResponse.json({ error: "Invalid verifiedUntil date." }, { status: 400 });
    }
    payload.verified_until = verifiedUntil;
  }

  const { error } = await supabaseAdmin
    .from("businesses")
    .update(payload)
    .eq("id", businessId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire the right email for the transition that just happened — never blocks
  // the response, and quietly does nothing if Resend isn't configured yet
  if (before) {
    const justApproved = before.status !== "active" && status === "active";
    const justVerified = !before.verified && !!verified;

    if (justApproved || justVerified) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(before.owner_id);
      const email = authUser?.user?.email;
      if (email) {
        if (justApproved) sendApprovalEmail(email, before.name);
        if (justVerified) sendVerifiedEmail(email, before.name, verifiedUntil ?? null);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
