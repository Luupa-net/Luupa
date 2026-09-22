-- v23: staff logins — phone + PIN via Supabase Auth's own phone/password
-- support (Supabase hashes and stores the PIN itself, same as it already does
-- for every owner's email/password — no custom crypto here), plus RLS scoping
-- so staff can run the calendar for their business without ever being able to
-- read revenue figures (amount, discount, payment method) — even via a direct
-- REST call, not just hidden in the UI. Same principle as `businesses_public`
-- in migration-v15.sql: RLS restricts ROWS, never columns, so a column that
-- must stay hidden needs a view, not just a narrower select() in the app.

alter table staff add column if not exists auth_user_id uuid references auth.users(id);

create unique index if not exists idx_staff_auth_user_id
  on staff(auth_user_id) where auth_user_id is not null;

-- Staff can see their own row — needed to bootstrap "who am I, which
-- business, what's my role" right after logging in.
drop policy if exists "Staff can view their own row" on staff;
create policy "Staff can view their own row"
  on staff for select
  using (auth_user_id = auth.uid());

-- ...and the rest of their team's roster — names only matter for display
-- (e.g. attributing a status change to a colleague), nothing sensitive here.
-- Safe despite referencing `staff` from its own policy: the direct-equality
-- policy above independently makes each member's own row visible, which is
-- exactly the row this subquery needs to resolve against for it to work.
drop policy if exists "Staff can view their business roster" on staff;
create policy "Staff can view their business roster"
  on staff for select
  using (
    business_id in (
      select s2.business_id from staff s2
      where s2.auth_user_id = auth.uid() and s2.active
    )
  );

-- Staff can create and update bookings for their own business, same shape as
-- the existing owner policies. Deliberately NO staff select policy on the
-- base table — reads go through bookings_operational below instead, which is
-- the only thing that can't hand back amount/discount/payment_method even via
-- a raw REST call against /rest/v1/bookings.
drop policy if exists "Staff can insert bookings for their business" on bookings;
create policy "Staff can insert bookings for their business"
  on bookings for insert
  with check (
    business_id in (select business_id from staff where auth_user_id = auth.uid() and active)
  );

drop policy if exists "Staff can update bookings for their business" on bookings;
create policy "Staff can update bookings for their business"
  on bookings for update
  using (
    business_id in (select business_id from staff where auth_user_id = auth.uid() and active)
  )
  with check (
    business_id in (select business_id from staff where auth_user_id = auth.uid() and active)
  );

-- Revenue-free read surface for staff: every column the calendar/booking UI
-- actually needs, minus amount/discount_amount/discount_note/payment_method.
-- `paid` stays — staff need to know a car can leave, they just never see a
-- figure. Deliberately NOT security_invoker (same choice as businesses_public):
-- it runs as the view's owner, which is how it can read `bookings` at all
-- despite staff having no SELECT policy on the base table — this view's own
-- WHERE clause is what actually authorizes each staff member's access.
create or replace view bookings_operational as
  select
    id, business_id, customer_name, customer_contact, customer_email, customer_id,
    service, preferred_date, preferred_time, note, status, created_at, paid,
    source, vehicle_make, vehicle_model, vehicle_plate, assigned_staff_id,
    reminder_sent_at
  from bookings
  where business_id in (
    select business_id from staff where auth_user_id = auth.uid() and active
  );

grant select on bookings_operational to authenticated;

-- Staff can see the audit trail too — read-only either way, since this table
-- has no insert/update/delete policy for anyone; only the trigger writes to it.
drop policy if exists "Staff can view their business's booking status history" on booking_status_history;
create policy "Staff can view their business's booking status history"
  on booking_status_history for select
  using (
    business_id in (select business_id from staff where auth_user_id = auth.uid() and active)
  );
