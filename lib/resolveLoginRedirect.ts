import { supabase } from "@/lib/supabase";

// The login page no longer asks "are you a business or a customer?" — both
// sign in through the same form and this decides where they land. A caller
// that already knows exactly where it wants the user (an explicit ?next=)
// always wins; only the bare default ("/") gets upgraded to the business
// dashboard when this account turns out to own a business.
export async function resolveLoginRedirect(userId: string, next: string, hadExplicitNext: boolean): Promise<string> {
  if (hadExplicitNext) return next;
  const { data } = await supabase.from("businesses").select("id").eq("owner_id", userId).maybeSingle();
  return data ? "/business/dashboard" : next;
}
