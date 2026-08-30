import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "luupa_admin_session";

function expectedToken(): string {
  // Signed with a server-only secret. The cookie never contains the actual
  // password — just this derived token — so it can't be reverse-engineered
  // even if someone got hold of it.
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET!)
    .update("admin-authenticated")
    .digest("hex");
}

export function createAdminToken(): string {
  return expectedToken();
}

export function isValidAdminSession(): boolean {
  const cookie = cookies().get(COOKIE_NAME)?.value;
  if (!cookie) return false;

  const expected = expectedToken();
  // Constant-time comparison — prevents timing attacks from leaking the token
  // one character at a time.
  const a = Buffer.from(cookie);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
