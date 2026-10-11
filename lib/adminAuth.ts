import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "luupa_admin_session";
export const ADMIN_SESSION_SECONDS = 60 * 60 * 8;

function sign(payload: string): string {
  // Signed with a server-only secret. The cookie never contains the actual
  // password — just this derived token — so it can't be reverse-engineered
  // even if someone got hold of it.
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET!).update(payload).digest("hex");
}

// "<expiresAt>.<hmac>" — the expiry is part of what's signed, so the session
// genuinely ends after 8 hours. (It used to be one fixed HMAC forever: a
// leaked cookie stayed valid until the secret itself was rotated.)
export function createAdminToken(): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS;
  return `${expiresAt}.${sign(`admin-authenticated:${expiresAt}`)}`;
}

export async function isValidAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME)?.value;
  if (!cookie) return false;

  const [expiresRaw, mac] = cookie.split(".");
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || !mac || expiresAt * 1000 < Date.now()) return false;

  // Constant-time comparison — prevents timing attacks from leaking the token
  // one character at a time.
  const a = Buffer.from(mac);
  const b = Buffer.from(sign(`admin-authenticated:${expiresAt}`));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Compares HMAC digests rather than the raw strings, so the comparison is
// constant-time AND doesn't leak the real password's length.
export function adminPasswordMatches(provided: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const key = process.env.ADMIN_SESSION_SECRET || "luupa-admin";
  const a = createHmac("sha256", key).update(provided).digest();
  const b = createHmac("sha256", key).update(expected).digest();
  return timingSafeEqual(a, b);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
