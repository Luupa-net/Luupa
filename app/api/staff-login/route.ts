import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createStaffAuthClient } from "@/lib/supabaseAuthClient";
import { normalizeWhatsAppNumber } from "@/lib/validation";
import { legacyPinToPassword, pinToPassword, staffAuthEmail } from "@/lib/staffPin";
import { readJson } from "@/lib/serverAuth";

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

function lockedResponse(lockedUntil: string | null) {
  const retryAfterSeconds = lockedUntil
    ? Math.max(1, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000))
    : LOCKOUT_MINUTES * 60;
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return NextResponse.json(
    { error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, reason: "locked", retryAfterSeconds },
    { status: 423 }
  );
}

// Charges one attempt BEFORE the PIN is checked, atomically under a row lock
// (staff_pin_attempt, migration-v30) — so N parallel guesses count as N, not
// as 1 each. Falls back to the old read-then-write if v30 isn't applied yet.
async function chargeAttempt(staff: { id: string; failed_pin_attempts: number; locked_until: string | null }) {
  const { data, error } = await supabaseAdmin.rpc("staff_pin_attempt", {
    p_staff_id: staff.id,
    p_max: MAX_FAILED_ATTEMPTS,
    p_lock_minutes: LOCKOUT_MINUTES,
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (!error && row) {
    return { allowed: !!row.allowed, attempts: Number(row.attempts) || 0, lockedUntil: row.locked_until as string | null, atomic: true };
  }

  const now = Date.now();
  const locked = !!staff.locked_until && new Date(staff.locked_until).getTime() > now;
  if (locked) return { allowed: false, attempts: staff.failed_pin_attempts, lockedUntil: staff.locked_until, atomic: false };
  // Lazy-expiry reset: an expired lock starts a fresh window.
  const previous = staff.locked_until ? 0 : staff.failed_pin_attempts;
  return { allowed: true, attempts: previous + 1, lockedUntil: null, atomic: false };
}

export async function POST(req: NextRequest) {
  const body = await readJson<{ phone?: unknown; pin?: unknown }>(req);
  const phone = typeof body?.phone === "string" ? body.phone : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";
  if (!phone || !/^\d{4,6}$/.test(pin)) {
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
    .select("id, active, auth_user_id, failed_pin_attempts, locked_until")
    .eq("phone", normalizedPhone)
    .not("auth_user_id", "is", null)
    .limit(1);
  const staffRow = rows?.[0] ?? null;

  // No such phone, or a real-but-deactivated/not-yet-set-up account: identical
  // response — this is the enumeration-avoidance boundary.
  if (!staffRow || !staffRow.active) {
    return NextResponse.json(GENERIC_INVALID, { status: 401 });
  }

  const attempt = await chargeAttempt(staffRow);
  if (!attempt.allowed) return lockedResponse(attempt.lockedUntil);

  const email = staffAuthEmail(staffRow.id);
  const authClient = createStaffAuthClient();
  let { data, error: signInError } = await authClient.auth.signInWithPassword({
    email,
    password: pinToPassword(pin, staffRow.id),
  });

  // Accounts whose PIN was set before the secret-derived scheme: accept the
  // old form once (still behind this same lockout) and upgrade on the spot.
  if (signInError?.code === "invalid_credentials") {
    const legacy = await authClient.auth.signInWithPassword({ email, password: legacyPinToPassword(pin) });
    if (!legacy.error && legacy.data.session) {
      data = legacy.data;
      signInError = null;
      await supabaseAdmin.auth.admin.updateUserById(staffRow.auth_user_id!, { password: pinToPassword(pin, staffRow.id) });
    }
  }

  if (!signInError && data.session) {
    await supabaseAdmin
      .from("staff")
      .update({ failed_pin_attempts: 0, locked_until: null, last_login_at: new Date().toISOString() })
      .eq("id", staffRow.id);
    return NextResponse.json({ ok: true, access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  }

  const code = signInError?.code;

  // Allowlist, not a blocklist: only a confirmed wrong-credentials rejection
  // counts as a guess. Any other/unknown code is refunded below.
  if (code === "invalid_credentials") {
    const lockNow = attempt.attempts >= MAX_FAILED_ATTEMPTS;
    if (!attempt.atomic) {
      const lockedUntil = lockNow ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString() : null;
      await supabaseAdmin.from("staff").update({ failed_pin_attempts: attempt.attempts, locked_until: lockedUntil }).eq("id", staffRow.id);
    }
    if (lockNow) return lockedResponse(attempt.lockedUntil);
    return NextResponse.json(GENERIC_INVALID, { status: 401 });
  }

  // A system error isn't the staff member's fault — give the attempt back.
  if (attempt.atomic) {
    await supabaseAdmin
      .from("staff")
      .update({ failed_pin_attempts: Math.max(0, attempt.attempts - 1), locked_until: null })
      .eq("id", staffRow.id);
  }
  return NextResponse.json(
    { error: (code && SYSTEM_ERROR_MESSAGES[code]) || "Something went wrong — try again.", reason: "system_error", code: code || "unknown" },
    { status: 400 }
  );
}
