-- migration-v30: security hardening from the pre-launch audit (2026-10-11).
--
-- Run AFTER migration-v29.sql. Every statement is idempotent, so re-running
-- the whole file is safe.

-- ---------------------------------------------------------------------------
-- 1. CRITICAL: the public views were writable by anyone.
--
-- businesses_public / reviews_public / bookings_operational are plain views
-- owned by postgres, so Postgres treats them as auto-updatable and runs writes
-- through them with the OWNER's rights — base-table RLS never applied. With
-- just the public anon key, anyone could PATCH or DELETE any visible review
-- or active listing over REST (confirmed with a rolled-back test as `anon`).
-- The app only ever reads these views.
-- ---------------------------------------------------------------------------
revoke insert, update, delete, truncate, references, trigger on businesses_public from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on reviews_public from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on bookings_operational from anon, authenticated;
revoke all on bookings_operational from anon;

-- Caller-supplied filters must never be evaluated against rows the view's
-- own WHERE hides (no leaky-predicate side channels on pending businesses,
-- hidden reviews, or other businesses' bookings).
alter view businesses_public set (security_barrier = true);
alter view reviews_public set (security_barrier = true);
alter view bookings_operational set (security_barrier = true);

-- ---------------------------------------------------------------------------
-- 2. Defense in depth: no API role needs TRUNCATE/TRIGGER/REFERENCES on any
-- table (TRUNCATE in particular bypasses RLS entirely).
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke truncate, trigger, references on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. `inquiries` is no longer used by the app, but still let ANYONE insert
-- rows for any business. Close it.
-- ---------------------------------------------------------------------------
drop policy if exists "Anyone can submit an inquiry" on inquiries;

-- ---------------------------------------------------------------------------
-- 4. Staff could read every coworker's national ID (CPR), phone, and PIN
-- lockout state. Staff now see only their own row on the base table, and
-- read the team's names through a narrow directory view.
-- ---------------------------------------------------------------------------
drop policy if exists "Owners and staff can view their business roster" on staff;
drop policy if exists "Owners see their roster, staff see themselves" on staff;
create policy "Owners see their roster, staff see themselves"
  on staff for select
  using (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
    or auth_user_id = (select auth.uid())
  );

create or replace view staff_directory with (security_barrier = true) as
  select id, business_id, name, role, active, auth_user_id
  from staff
  where business_id in (select id from businesses where owner_id = auth.uid())
     or business_id = staff_business_id_for(auth.uid());

revoke all on staff_directory from public, anon;
grant select on staff_directory to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Staff write bookings only through update_booking_operational() (v29),
-- which whitelists the columns they may touch. Their direct UPDATE grant on
-- the base table is no longer needed — drop it so a filter-less PATCH can't
-- touch every booking at once.
-- ---------------------------------------------------------------------------
drop policy if exists "Owners and staff can update bookings for their business" on bookings;
drop policy if exists "Owners can update bookings for their business" on bookings;
create policy "Owners can update bookings for their business"
  on bookings for update
  using (business_id in (select id from businesses where owner_id = (select auth.uid())))
  with check (business_id in (select id from businesses where owner_id = (select auth.uid())));

-- Staff adding a walk-in: INSERT ... RETURNING needs a SELECT policy staff
-- don't have, so the insert itself errored. They go through this instead.
create or replace function create_staff_booking(p_booking jsonb)
returns uuid as $$
declare
  biz uuid;
  new_id uuid;
begin
  biz := staff_business_id_for(auth.uid());
  if biz is null then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if coalesce(trim(p_booking->>'customer_name'), '') = '' then
    raise exception 'Customer name is required';
  end if;

  insert into bookings (
    business_id, customer_name, customer_contact, customer_email, service,
    preferred_date, preferred_time, vehicle_make, vehicle_model, vehicle_plate,
    note, status, source
  ) values (
    biz,
    left(trim(p_booking->>'customer_name'), 120),
    left(coalesce(p_booking->>'customer_contact', ''), 32),
    left(nullif(trim(p_booking->>'customer_email'), ''), 254),
    left(nullif(p_booking->>'service', ''), 200),
    nullif(p_booking->>'preferred_date', '')::date,
    left(nullif(p_booking->>'preferred_time', ''), 16),
    left(nullif(p_booking->>'vehicle_make', ''), 80),
    left(nullif(p_booking->>'vehicle_model', ''), 80),
    left(nullif(p_booking->>'vehicle_plate', ''), 32),
    left(nullif(p_booking->>'note', ''), 2000),
    'confirmed',
    'manual'
  )
  returning id into new_id;
  return new_id;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

revoke execute on function create_staff_booking(jsonb) from public, anon;
grant execute on function create_staff_booking(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Staff PIN lockout, made atomic. The old read-then-write in the login
-- route let N parallel guesses all read "0 failures" and each count as one,
-- so the 5-attempt lockout could be bypassed with concurrency. Each attempt
-- is now charged under a row lock BEFORE the PIN is checked; success resets.
-- ---------------------------------------------------------------------------
create or replace function staff_pin_attempt(p_staff_id uuid, p_max int, p_lock_minutes int)
returns table (allowed boolean, attempts int, locked_until timestamptz) as $$
#variable_conflict use_column
declare
  s staff%rowtype;
  n int;
  lock_at timestamptz;
begin
  select * into s from staff where id = p_staff_id for update;
  if not found then
    return query select false, 0, null::timestamptz;
    return;
  end if;
  if s.locked_until is not null and s.locked_until > now() then
    return query select false, s.failed_pin_attempts, s.locked_until;
    return;
  end if;

  -- An expired lock starts a fresh window.
  n := case when s.locked_until is not null then 0 else coalesce(s.failed_pin_attempts, 0) end + 1;
  lock_at := case when n >= p_max then now() + make_interval(mins => p_lock_minutes) else null end;
  update staff set failed_pin_attempts = n, locked_until = lock_at where id = p_staff_id;
  return query select true, n, lock_at;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

revoke execute on function staff_pin_attempt(uuid, int, int) from public, anon, authenticated;
grant execute on function staff_pin_attempt(uuid, int, int) to service_role;

-- ---------------------------------------------------------------------------
-- 7. Customers can cancel their own upcoming booking (pending/confirmed).
-- ---------------------------------------------------------------------------
create or replace function cancel_my_booking(p_booking_id uuid)
returns bookings as $$
declare
  b bookings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  select * into b from bookings where id = p_booking_id and customer_id = auth.uid() for update;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  if b.status not in ('pending', 'confirmed') then
    raise exception 'CANCEL: this booking can''t be cancelled online anymore — contact the business directly';
  end if;
  update bookings set status = 'cancelled' where id = b.id returning * into b;
  return b;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

revoke execute on function cancel_my_booking(uuid) from public, anon;
grant execute on function cancel_my_booking(uuid) to authenticated;
