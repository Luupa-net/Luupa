import { NextRequest, NextResponse, after } from "next/server";
import { isValidAdminSession } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendApprovalEmail, sendVerifiedEmail } from "@/lib/email";
import { isUuid, readJson } from "@/lib/serverAuth";

const ALLOWED_STATUSES = ["pending", "active", "suspended"];

export async function POST(req: NextRequest) {
  if (!(await isValidAdminSession())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await readJson<{ businessId?: unknown; status?: unknown; verified?: unknown; verifiedUntil?: unknown }>(req);
  const { businessId, status, verified, verifiedUntil } = body ?? {};

  if (!isUuid(businessId) || typeof status !== "string" || !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Fetch the current state first, so we can tell what actually changed —
  // an email should only fire on a real transition, not every save
  const { data: before, error: beforeError } = await supabaseAdmin
    .from("businesses")
    .select("owner_id, name, status, verified")
    .eq("id", businessId)
    .maybeSingle();
  if (beforeError) return NextResponse.json({ error: beforeError.message }, { status: 500 });
  if (!before) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  const payload: Record<string, any> = { status, verified: !!verified };

  if (verifiedUntil !== undefined) {
    if (verifiedUntil !== null && (typeof verifiedUntil !== "string" || isNaN(new Date(verifiedUntil).getTime()))) {
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

  // Fire the right email for the transition that just happened. after()
  // keeps the function alive until it's sent — a bare un-awaited promise
  // can be frozen the moment the response goes out on serverless.
  const justApproved = before.status !== "active" && status === "active";
  const justVerified = !before.verified && !!verified;
  if (justApproved || justVerified) {
    after(async () => {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(before.owner_id);
      const email = authUser?.user?.email;
      if (!email) return;
      if (justApproved) await sendApprovalEmail(email, before.name);
      if (justVerified) await sendVerifiedEmail(email, before.name, typeof verifiedUntil === "string" ? verifiedUntil : null);
    });
  }

  return NextResponse.json({ ok: true });
}
