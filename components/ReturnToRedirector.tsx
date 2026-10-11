"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useBusiness } from "@/lib/BusinessContext";
import { clearReturnTo, currentPath, isAuthPath, peekReturnTo } from "@/lib/authReturn";

// Safety net for sign-ins that finish somewhere OTHER than the login/signup
// page — e.g. Supabase bouncing a Google login or an email-confirmation link
// to the bare Site URL because the exact redirect URL isn't allow-listed.
// If a fresh (≤30 min) "return here" is pending and the user is now signed
// in, finish the trip. The login/signup pages handle the normal case
// themselves and clear this before navigating, so it never double-fires.
export default function ReturnToRedirector() {
  const { userId, checked } = useBusiness();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!checked || !userId || isAuthPath(pathname)) return;
    const target = peekReturnTo();
    if (!target) return;
    clearReturnTo();
    if (target !== currentPath()) router.replace(target);
  }, [checked, userId, pathname, router]);

  return null;
}
