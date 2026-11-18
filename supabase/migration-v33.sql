-- migration-v33: make staff_directory read-only for signed-in users.
--
-- v30 meant this view to be select-only, but `grant select` never removed
-- the ALL grant authenticated already had from Supabase's default
-- privileges. The view is owned by postgres (which bypasses RLS), is
-- auto-updatable and exposes business_id/auth_user_id/active, so any
-- signed-in user could INSERT themselves as staff of any business through
-- it. The app only ever reads it (lib/staffDirectory.ts).
--
-- Applied to the live project on 2026-11-19. Safe to re-run.

revoke insert, update, delete, truncate, references, trigger on public.staff_directory from authenticated;
