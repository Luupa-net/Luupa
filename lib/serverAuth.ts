import { NextRequest } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// Server-only helpers for API routes that act on behalf of a signed-in user.

// Verifies the caller's Supabase access token (Authorization: Bearer …)
// with Supabase itself — never trusts anything client-supplied about who
// they are.
export async function getRequestUser(req: NextRequest): Promise<{ user: User; token: string } | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { user: data.user, token };
}

// A per-request client that runs AS the caller, so RLS and auth.uid()-based
// checks inside SQL functions (checkout_booking, …) apply exactly as they
// would from the browser. Use this for writes; reserve supabaseAdmin for
// the reads/side-effects a route has already authorized itself.
export function userScopedClient(token: string) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

// Absolute base URL for links inside emails/WhatsApp messages. Prefer the
// configured canonical URL; otherwise the origin this request came in on.
export function siteUrl(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  return configured || req.nextUrl.origin;
}

export async function readJson<T = Record<string, unknown>>(req: NextRequest): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
