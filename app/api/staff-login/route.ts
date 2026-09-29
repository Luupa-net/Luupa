import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createStaffAuthClient } from "@/lib/supabaseAuthClient";
import { normalizeWhatsAppNumber } from "@/lib/validation";
import { pinToPassword, staffAuthEmail } from "@/lib/staffPin";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// System-level failures — never counted against a staff member's own attempt
// counter, and shown as their own message instead of the generic wrong-PIN
// one. Centralizes the error-code handling that used to live client-side in
// app/staff/login/page.tsx.
const SYSTEM_ERROR_MESSAGES: Record<string, string> = {
  over_request_rate_limit: "Too many attempts — wait a bit and try again.",
};

const GENERIC_INVALID = {
  error: "That phone number and PIN don't match. Check with your manager.",
  reason: "invalid_credentials",
};

export async function POST(req: NextRequest) {
  const { phone, pin } = await req.json();
  if (!phone || typeof pin !== "string" || !pin) {
    return NextResponse.json({ error: "Enter your phone number and PIN." }, { status: 400 });
  }

  // Same normalized value is used for the lookup AND the sign-in call below —
  // never the raw `staff.phone` column — so this route can never desync from
  // whatever normalizeWhatsAppNumber() would produce today, regardless of
  // whether the stored column happens to already be canonical.
  const normalizedPhone = normalizeWhatsAppNumber(phone);

  // Not .single()/.maybeSingle(): staff.phone has no unique constraint, so a
  // data-integrity edge case producing 2 matching rows must degrade to "not
  // found" rather than a hard 500.
  const { data: rows } = await supabaseAdmin
    .from("staff")
    .select("id, active, failed_pin_attempts, locked_until")
    .eq("phone", normalizedPhone)
    .not("auth_user_id", "is", null)
    .limit(1);
  const staffRow = rows?.[0] ?? null;

  // No such phone, or a real-but-deactivated/not-yet-set-up account: identical
  // response — this is the enumeration-avoidance boundary.
  if (!staffRow || !staffRow.active) {
    return NextResponse.json(GENERIC_INVALID, { status: 401 });
  }

  const now = Date.now();
  const isLocked = !!staffRow.locked_until && new Date(staffRow.locked_until).getTime() > now;

  if (isLocked) {
    const retryAfterSeconds = Math.max(0, Math.ceil((new Date(staffRow.locked_until!).getTime() - now) / 1000));
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, reason: "locked", retryAfterSeconds },
      { status: 423 }
    );
  }

  // Lazy-expiry reset: a past locked_until means "treat as unlocked," and the
  // counter starts over from here — computed in-memory (not a separate
  // write) so a fresh post-expiry failure counts as 1, not stale+1, which
  // would instantly re-lock on the very first attempt after expiry.
  const effectiveFailedAttempts = staffRow.locked_until && !isLocked ? 0 : staffRow.failed_pin_attempts;

  const authClient = createStaffAuthClient();
  const { data, error: signInError } = await authClient.auth.signInWithPassword({
    email: staffAuthEmail(staffRow.id),
    password: pinToPassword(pin),
  });

  if (!signInError && data.session) {
    await supabaseAdmin
      .from("staff")
      .update({ failed_pin_attempts: 0, locked_until: null, last_login_at: new Date().toISOString() })
      .eq("id", staffRow.id);
    return NextResponse.json({ ok: true, access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  }

  const code = signInError?.code;

  // Allowlist, not a blocklist: only a confirmed wrong-credentials rejection
  // counts as a guess. Any other/unknown code falls through untouched below.
  if (code === "invalid_credentials") {
    const newCount = effectiveFailedAttempts + 1;
    if (newCount >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(now + LOCKOUT_MINUTES * 60_000).toISOString();
      await supabaseAdmin.from("staff").update({ failed_pin_attempts: newCount, locked_until: lockedUntil }).eq("id", staffRow.id);
      return NextResponse.json(
        { error: `Too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`, reason: "locked", retryAfterSeconds: LOCKOUT_MINUTES * 60 },
        { status: 423 }
      );
    }
    await supabaseAdmin.from("staff").update({ failed_pin_attempts: newCount, locked_until: null }).eq("id", staffRow.id);
    return NextResponse.json(GENERIC_INVALID, { status: 401 });
  }

  return NextResponse.json(
    { error: (code && SYSTEM_ERROR_MESSAGES[code]) || "Something went wrong — try again.", reason: "system_error", code: code || "unknown" },
    { status: 400 }
  );
}
