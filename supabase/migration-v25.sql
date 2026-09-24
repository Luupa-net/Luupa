-- v25: staff national ID (CPR) field, and lock down staff_business_id_for.
--
-- 1. Adds an optional national_id column to staff, for businesses that want
--    to keep a CPR/national ID on file per staff member (e.g. for payroll or
--    identity verification) — same idea as phone, plain optional text.
--
-- 2. migration-v24's staff_business_id_for() revoked EXECUTE from `public`
--    and granted it to `authenticated`, expecting that to also lock out
--    `anon`. It didn't: the advisors flagged `anon` as still able to call it
--    via /rest/v1/rpc/staff_business_id_for. `anon` must have picked up
--    EXECUTE from a separate default grant (Postgres grants EXECUTE on new
--    functions to PUBLIC by default, and the earlier REVOKE FROM PUBLIC
--    apparently ran before `anon` had inherited it, or `anon` held a direct
--    grant already). Revoking from `anon` explicitly closes that: an
--    unauthenticated caller could otherwise pass an arbitrary uid and learn
--    which business_id (if any) that uid is an active staff member of.

alter table staff add column if not exists national_id text;

revoke execute on function staff_business_id_for(uuid) from anon;
