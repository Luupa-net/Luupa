import { supabase } from "@/lib/supabase";

// After a sign-in that didn't go through our own signup form — Google OAuth,
// or an email-confirmation link where the form's session never existed —
// Supabase has an auth user but this app's own `customers` row (name/phone/
// email) doesn't exist yet. Call this once the session is live so every
// customer ends up with the same profile a form signup would have. Name and
// phone come from user_metadata (Google's full_name, or what the signup
// form stashed there via signUp's options.data).
export async function ensureCustomerAccount(
  userId: string,
  meta: { email?: string | null; name?: string | null; phone?: string | null }
): Promise<{ error: string | null }> {
  const { data: existing, error: lookupError } = await supabase.from("customers").select("id").eq("id", userId).maybeSingle();
  if (lookupError) return { error: lookupError.message };
  if (existing) return { error: null };

  const { error: insertError } = await supabase.from("customers").insert({
    id: userId,
    name: (meta.name || "").trim().slice(0, 120) || meta.email?.split("@")[0] || "New customer",
    email: meta.email ?? null,
    phone: (meta.phone || "").trim().slice(0, 32),
  });
  // A concurrent call (e.g. the auth event and the form's own submit both
  // finishing at once) can lose the insert race — that's success, not failure.
  if (insertError && insertError.code === "23505") return { error: null };
  return { error: insertError?.message ?? null };
}
