// Supabase's project-wide password policy requires 8+ characters with a mix
// of upper/lower case, a digit, and a symbol — a bare 4-6 digit PIN can't
// satisfy that alone. This wraps the PIN in a fixed prefix/suffix so Supabase
// accepts it as a password, without changing what a staff member actually
// types on the sign-in pad. The wrapper adds no real secrecy of its own (it
// ships in client-side JS, so it isn't hidden) — the real security rests on
// the PIN's own digit space plus Supabase's login rate limiting, the same
// trust model as a POS employee PIN on a shared front-desk device, not a
// fully public login form. Used identically when a PIN is set (the owner-only
// API route) and when it's checked (the staff login page) — they must never
// drift apart, or logins silently stop matching.
export function pinToPassword(pin: string): string {
  return `Sp1!${pin}qR`;
}
