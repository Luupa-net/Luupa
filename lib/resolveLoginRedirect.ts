import { supabase } from "@/lib/supabase";

// The login page no longer asks "are you a business or a customer?" — both
// sign in through the same form and this decides where they land. A caller
// that already knows exactly where it wants the user (an explicit ?next=)
// always wins; only the bare default ("/") gets upgraded to the business
// dashboard when this account turns out to own a business.
export async function resolveLoginRedirect(userId: string, next: string, hadExplicitNext: boolean): Promise<string> {
  if (hadExplicitNext) return next;
  const { data, error } = await supabase.from("businesses").select("id").eq("owner_id", userId).maybeSingle();
  // A transient failure here must not look identical to "not a business
  // owner" — that silently sent real owners to the customer destination
  // with nothing to explain why. Logged rather than surfaced in the UI:
  // there's no good place to show an error mid-OAuth-redirect, and `next`
  // remains a safe fallback either way.
  if (error) console.error("resolveLoginRedirect: ownership lookup failed", error.message);
  return data ? "/business/dashboard" : next;
}
