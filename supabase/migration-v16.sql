-- Luupa migration v16 — run this in your Supabase SQL editor.
-- HARDENING (flagged by Supabase's own security advisor after v14/v15):
-- 1. Pin search_path on both SECURITY DEFINER functions so they can't be
--    tricked by a role-mutable search_path into resolving an unqualified
--    identifier against an attacker-created object in another schema.
-- 2. protect_admin_controlled_fields() is a trigger function only — it
--    relies on NEW/OLD and was never meant to be called directly, but
--    Postgres (and Supabase's own default privileges) grant EXECUTE to
--    PUBLIC and to anon/authenticated directly on function creation,
--    exposing it at /rest/v1/rpc/protect_admin_controlled_fields. Revoking
--    direct EXECUTE removes that needless surface — trigger invocation
--    does not depend on the invoking role holding EXECUTE on the trigger
--    function itself, so this does not affect the trigger (verified live:
--    the "enforce_admin_controlled_fields" trigger stays attached/enabled).
--
-- increment_view_count's EXECUTE grant to anon/authenticated is left as-is
-- (intentional, documented in schema.sql — public view-count tracking).

alter function protect_admin_controlled_fields() set search_path = public, pg_temp;
alter function increment_view_count(uuid) set search_path = public, pg_temp;

revoke execute on function protect_admin_controlled_fields() from public;
revoke execute on function protect_admin_controlled_fields() from anon, authenticated;
