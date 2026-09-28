-- v26: server-side staff PIN login (app/api/staff-login/route.ts) with
-- per-account lockout, plus last-login tracking. Moves the
-- supabase.auth.signInWithPassword() call that used to run directly from
-- app/staff/login/page.tsx (anon key, no attempt tracking possible) behind a
-- server route that can read/write these columns with the service role.
-- Lockout expiry is checked lazily by the route itself on each login
-- attempt — no cron/cleanup job needed.

alter table staff add column if not exists failed_pin_attempts integer not null default 0;
alter table staff add column if not exists locked_until timestamptz;
alter table staff add column if not exists last_login_at timestamptz;

-- New query pattern as of this migration: the login route looks staff up by
-- phone (it has no session yet, so it can't start from auth_user_id like
-- every other staff RLS policy does). Unindexed before now because nothing
-- queried staff by phone.
create index if not exists idx_staff_phone on staff(phone);
