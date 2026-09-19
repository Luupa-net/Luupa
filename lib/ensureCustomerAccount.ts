import { supabase } from "@/lib/supabase";

// After a Google OAuth sign-in, Supabase has created an auth user but this
// app's own `customers` row (name/phone/email) doesn't exist yet — unlike
// the email/password signup flow, which inserts it explicitly. Call this
// once right after an OAuth redirect lands, so a Google sign-in ends up
// with the same customer profile a manual signup would have.
export async function ensureCustomerAccount(userId: string, meta: { email?: string | null; name?: string | null }) {
  const { data: existing } = await supabase.from("customers").select("id").eq("id", userId).maybeSingle();
  if (existing) return;

  await supabase.from("customers").insert({
    id: userId,
    name: meta.name || meta.email?.split("@")[0] || "New customer",
    email: meta.email ?? null,
    phone: "",
  });
}
