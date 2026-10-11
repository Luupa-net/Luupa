"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/lib/BusinessContext";
import { currentPath, loginHref } from "@/lib/authReturn";

export type BusinessGuardState = "checking" | "error" | "signed_out" | "not_business" | "staff_redirect" | "ready";

// One shared gate for every /business/* app page.
//
// BUG FIX (redirect loop): pages used to send ANYONE without a business to
// /account/login?next=<this page>. A signed-in customer is already logged
// in, so the login page immediately sent them back to `next` — which
// bounced them to login again, forever. Now only a signed-out visitor is
// sent to log in; a signed-in account without a business gets a clear
// "this area is for businesses" screen (<NotBusinessAccount />) instead.
export function useBusinessGuard({ ownerOnly = false }: { ownerOnly?: boolean } = {}) {
  const ctx = useBusiness();
  const router = useRouter();
  const { business, role, checked, loadError, userId } = ctx;

  const state: BusinessGuardState = !checked
    ? "checking"
    : loadError
    ? "error"
    : !userId
    ? "signed_out"
    : !business
    ? "not_business"
    : ownerOnly && role === "staff"
    ? "staff_redirect"
    : "ready";

  useEffect(() => {
    if (state === "signed_out") router.replace(loginHref(currentPath()));
    else if (state === "staff_redirect") router.replace("/business/bookings");
  }, [state, router]);

  return { ...ctx, state };
}
