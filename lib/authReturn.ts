import { safeNextPath } from "@/lib/validation";

// "Where was this person, and what were they doing, before we asked them to
// sign in?" — remembered on the client so it survives everything that can
// happen between clicking "Log in" and actually having a session:
//   - a Google OAuth round trip (and Supabase falling back to the bare Site
//     URL if a redirect URL isn't allow-listed, which drops ?next= entirely)
//   - an email-confirmation link opened later, possibly in a new tab
//   - hopping between /account/login and /account/signup
// ?next= in the URL is still the primary signal; this is the safety net
// behind it. Always re-validated through safeNextPath on the way out, so a
// tampered storage value can never become an open redirect.

const KEY = "luupa:returnTo";
// Long enough to cover "sign up → go check email → click confirm", short
// enough that an abandoned attempt can't hijack an unrelated login days later.
const TTL_MS = 30 * 60 * 1000;

// Pages that ARE the auth flow — never somewhere to "return" to.
const AUTH_PATHS = ["/account/login", "/account/signup", "/account/reset-password", "/business/login", "/staff/login"];

export function isAuthPath(path: string): boolean {
  return AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}?`) || path.startsWith(`${p}/`));
}

export function rememberReturnTo(path: string | null | undefined) {
  const safe = safeNextPath(path);
  if (safe === "/" || isAuthPath(safe)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ path: safe, at: Date.now() }));
  } catch {
    // Private mode / storage disabled — ?next= in the URL still carries it.
  }
}

export function peekReturnTo(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { path, at } = JSON.parse(raw) as { path?: string; at?: number };
    if (!path || !at || Date.now() - at > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    const safe = safeNextPath(path);
    return safe === "/" || isAuthPath(safe) ? null : safe;
  } catch {
    return null;
  }
}

export function clearReturnTo() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

// The login URL for "come back here afterwards" — used by every place that
// sends someone to sign in (navbar, gated pages, booking modal, review links).
export function loginHref(returnTo?: string | null, page: "login" | "signup" = "login"): string {
  const safe = safeNextPath(returnTo);
  const base = `/account/${page}`;
  return safe === "/" || isAuthPath(safe) ? base : `${base}?next=${encodeURIComponent(safe)}`;
}

export function currentPath(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}
