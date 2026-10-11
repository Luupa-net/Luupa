import { createHmac } from "crypto";

// SERVER-ONLY (uses a server secret). Imported by the staff-pin and
// staff-login API routes, never by client components.
//
// A staff member's Supabase Auth password is derived from their 6-digit PIN
// with a server-side secret: HMAC(secret, staffId + PIN). Without the secret
// a PIN can't be turned into the real password, so nobody can brute-force
// the 1,000,000 PINs directly against Supabase Auth — guesses have to go
// through /api/staff-login, which enforces the 5-attempt lockout.
//
// (The old scheme wrapped the PIN in a fixed, publicly-shipped prefix/suffix.
// Combined with the auth email being derivable from staff.id — which
// customers can see on their own bookings as assigned_staff_id — that let
// anyone skip the lockout entirely and brute-force a PIN against Supabase.)
//
// The "Sp1!…qR" wrapper keeps satisfying the project's password policy
// (upper/lower/digit/symbol). STAFF_PIN_SECRET is preferred; if it's not set
// this falls back to ADMIN_SESSION_SECRET. Changing whichever one is in use
// means every staff PIN has to be set again by the owner.
function pinSecret(): string {
  const s = process.env.STAFF_PIN_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("STAFF_PIN_SECRET (or ADMIN_SESSION_SECRET) must be set");
  return s;
}

export function pinToPassword(pin: string, staffId: string): string {
  const mac = createHmac("sha256", pinSecret()).update(`luupa-staff-pin:${staffId}:${pin}`).digest("base64url").slice(0, 40);
  return `Sp1!${mac}qR`;
}

// Pre-2026-10-11 accounts. Only ever tried by /api/staff-login (behind the
// lockout), and a successful legacy sign-in immediately upgrades the account
// to pinToPassword() — so this disappears from use after each staff
// member's next login.
export function legacyPinToPassword(pin: string): string {
  return `Sp1!${pin}qR`;
}

// The Supabase Auth identity for a staff account. Deliberately an email, not
// the staff member's real phone number: Supabase's Phone auth provider can't
// be turned on without first configuring a paid third-party SMS provider
// (Twilio/MessageBird/Vonage/TextLocal), even though staff sign-in never
// sends an SMS — accounts are created via the admin API with
// email_confirm: true and signed in with a password, no OTP involved. A
// synthetic internal email sidesteps that dependency entirely and is
// deterministic from staff.id, so it never needs to change even if the
// staff member's real phone number does. Never shown to the staff member —
// they only ever see phone + PIN.
export function staffAuthEmail(staffId: string): string {
  return `staff-${staffId}@staff.luupa.internal`;
}
