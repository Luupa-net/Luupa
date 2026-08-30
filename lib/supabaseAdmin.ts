import { createClient } from "@supabase/supabase-js";

// SECURITY: this uses the service role key, which bypasses Row Level Security
// entirely. It must NEVER be imported into a "use client" component or exposed
// to the browser — only used inside API routes (app/api/**/route.ts), which run
// exclusively on the server.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
