import { supabase } from "@/lib/supabase";

export type AccountKind = "owner" | "staff" | "customer";

// The login page no longer asks "are you a business or a customer?" — both
// sign in through the same form and this decides where they land. A caller
// that already knows exactly where it wants the user (an explicit ?next= that
// isn't just the home page) always wins — that's how "sign in to book" lands
// back in the booking form. Only the bare default gets upgraded to the
// account's own home: the dashboard for an owner, the bookings board for
// staff.
export async function resolveAccountKind(userId: string): Promise<{ kind: AccountKind; error: boolean }> {
  // Both lookups at once — they don't depend on each other.
  const [owned, staff] = await Promise.all([
    supabase.from("businesses").select("id").eq("owner_id", userId).maybeSingle(),
    supabase.from("staff").select("id").eq("auth_user_id", userId).eq("active", true).maybeSingle(),
  ]);
  // A transient failure here must not look identical to "not a business
  // owner" — logged rather than surfaced (there's no good place to show it
  // mid-redirect), and the caller falls back to a safe destination.
  if (owned.error) console.error("resolveAccountKind: ownership lookup failed", owned.error.message);
  if (staff.error) console.error("resolveAccountKind: staff lookup failed", staff.error.message);
  if (owned.data) return { kind: "owner", error: false };
  if (staff.data) return { kind: "staff", error: false };
  return { kind: "customer", error: !!(owned.error || staff.error) };
}

export function destinationFor(kind: AccountKind, next: string): string {
  if (next !== "/") return next;
  if (kind === "owner") return "/business/dashboard";
  if (kind === "staff") return "/business/bookings";
  return "/";
}
