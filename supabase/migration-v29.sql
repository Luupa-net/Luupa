-- migration-v29: checkout (payment before completion), staff status updates,
-- owner-only money columns, review requests/reports, new-booking alerts.
--
-- Run once against the live project (no staging — see project notes). Every
-- statement is idempotent-safe or guarded so a partial re-run doesn't error.

-- ---------------------------------------------------------------------------
-- 1. New bookkeeping columns on bookings
-- ---------------------------------------------------------------------------
alter table bookings
  add column if not exists paid_at timestamptz,
  add column if not exists receipt_sent_at timestamptz,
  add column if not exists review_requested_at timestamptz,
  add column if not exists owner_notified_at timestamptz,
  -- Last status the customer was emailed about (confirmed/declined/…), so a
  -- double click or two tabs can't send the same update twice.
  add column if not exists customer_notified_status text;

-- ---------------------------------------------------------------------------
-- 2. Money columns are owner-only, on every write path.
--
-- Staff have an UPDATE policy on bookings (they move statuses along) and
-- customers have an INSERT policy (they request bookings). Neither should be
-- able to touch amount/paid/discount/etc. — before this, a customer could
-- INSERT a booking that already said paid = true, and a staff session could
-- PATCH amount over REST even though the UI never shows it. Owners and the
-- service role (our own API routes) pass through untouched.
-- ---------------------------------------------------------------------------
create or replace function pin_booking_money_columns()
returns trigger as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- A booking can only ever be attached to the account creating it. Owner
    -- and staff manual entries used to accept any customer_id, which would
    -- drop a fake booking into a stranger's "My bookings".
    if new.customer_id is not null and new.customer_id is distinct from auth.uid() then
      new.customer_id := null;
    end if;
    -- Customers can only request bookings from live (approved) businesses.
    if coalesce(new.source, 'luupa') = 'luupa'
       and not exists (select 1 from businesses where id = new.business_id and status = 'active') then
      raise exception 'BOOKING_CLOSED: this business isn''t taking bookings right now'
        using errcode = 'P0001';
    end if;
  end if;

  if exists (select 1 from businesses where id = new.business_id and owner_id = auth.uid()) then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.business_id := old.business_id;
    new.amount := old.amount;
    new.paid := old.paid;
    new.payment_method := old.payment_method;
    new.discount_amount := old.discount_amount;
    new.discount_note := old.discount_note;
    new.paid_at := old.paid_at;
    new.receipt_sent_at := old.receipt_sent_at;
    new.review_requested_at := old.review_requested_at;
    new.owner_notified_at := old.owner_notified_at;
    new.reminder_sent_at := old.reminder_sent_at;
    new.customer_notified_status := old.customer_notified_status;
  else
    new.amount := null;
    new.paid := false;
    new.payment_method := null;
    new.discount_amount := 0;
    new.discount_note := null;
    new.paid_at := null;
    new.receipt_sent_at := null;
    new.review_requested_at := null;
    new.owner_notified_at := null;
    new.reminder_sent_at := null;
    new.customer_notified_status := null;
  end if;
  return new;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

drop trigger if exists enforce_booking_money_owner_only on bookings;
create trigger enforce_booking_money_owner_only
  before insert or update on bookings
  for each row execute function pin_booking_money_columns();

revoke execute on function pin_booking_money_columns() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. A booking can't become "completed" until it's paid.
--
-- Enforced in the database, not just hidden in the UI, so no code path
-- (keyboard shortcut, staff session, a stale tab, direct REST) can skip it.
-- Only the TRANSITION into completed is checked — legacy rows that were
-- completed before this rule existed stay editable. Trigger name sorts after
-- enforce_booking_money_owner_only, so it sees the pinned `paid` value.
-- ---------------------------------------------------------------------------
create or replace function enforce_paid_before_completion()
returns trigger as $$
begin
  if new.status = 'completed'
     and (tg_op = 'INSERT' or old.status is distinct from 'completed')
     and not coalesce(new.paid, false) then
    raise exception 'PAYMENT_REQUIRED: take payment before marking this booking completed'
      using errcode = 'P0001';
  end if;

  if tg_op = 'UPDATE' and old.status = 'completed' and coalesce(old.paid, false) and not coalesce(new.paid, false) then
    raise exception 'PAYMENT_LOCKED: a completed booking stays paid — record a refund instead'
      using errcode = 'P0001';
  end if;

  if coalesce(new.paid, false) and new.paid_at is null then
    new.paid_at := now();
  elsif not coalesce(new.paid, false) then
    new.paid_at := null;
  end if;
  return new;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

drop trigger if exists enforce_booking_paid_before_complete on bookings;
create trigger enforce_booking_paid_before_complete
  before insert or update on bookings
  for each row execute function enforce_paid_before_completion();

revoke execute on function enforce_paid_before_completion() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Staff status updates actually work now.
--
-- BUG: staff have an UPDATE policy on bookings but (deliberately) no SELECT
-- policy — and Postgres applies SELECT policies to any UPDATE with a WHERE
-- clause. Every staff "Confirm"/"Arrived"/etc. matched 0 rows and silently
-- did nothing. Rather than open SELECT on the base table (which would expose
-- revenue columns), staff write through this whitelisted RPC. Owners may use
-- it too; money columns are not accepted here at all.
-- ---------------------------------------------------------------------------
create or replace function update_booking_operational(p_booking_id uuid, p_changes jsonb)
returns void as $$
declare
  b bookings%rowtype;
  k text;
  allowed text[] := array['status', 'assigned_staff_id', 'vehicle_make', 'vehicle_model', 'vehicle_plate', 'customer_contact', 'customer_email', 'note'];
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then
    raise exception 'Invalid changes';
  end if;

  select * into b from bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;

  if not exists (select 1 from businesses where id = b.business_id and owner_id = auth.uid())
     and not exists (select 1 from staff where business_id = b.business_id and auth_user_id = auth.uid() and active) then
    raise exception 'Not allowed for this booking' using errcode = '42501';
  end if;

  for k in select jsonb_object_keys(p_changes) loop
    if not (k = any(allowed)) then
      raise exception 'Field % cannot be changed here', k;
    end if;
  end loop;

  update bookings set
    status            = case when p_changes ? 'status' then p_changes->>'status' else status end,
    assigned_staff_id = case when p_changes ? 'assigned_staff_id' then nullif(p_changes->>'assigned_staff_id', '')::uuid else assigned_staff_id end,
    vehicle_make      = case when p_changes ? 'vehicle_make' then left(p_changes->>'vehicle_make', 80) else vehicle_make end,
    vehicle_model     = case when p_changes ? 'vehicle_model' then left(p_changes->>'vehicle_model', 80) else vehicle_model end,
    vehicle_plate     = case when p_changes ? 'vehicle_plate' then left(p_changes->>'vehicle_plate', 32) else vehicle_plate end,
    customer_contact  = case when p_changes ? 'customer_contact' then left(p_changes->>'customer_contact', 32) else customer_contact end,
    customer_email    = case when p_changes ? 'customer_email' then left(nullif(trim(p_changes->>'customer_email'), ''), 254) else customer_email end,
    note              = case when p_changes ? 'note' then left(p_changes->>'note', 2000) else note end
  where id = p_booking_id;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

revoke execute on function update_booking_operational(uuid, jsonb) from public, anon;
grant execute on function update_booking_operational(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. One-step checkout: record the balance, mark paid, optionally complete.
--
-- Atomic — the payment row and the booking update land together or not at
-- all (before, the UI did these as separate requests and could half-apply).
-- Owner only. BHD uses 3 decimals (fils), so amounts round to 3 places.
-- ---------------------------------------------------------------------------
create or replace function checkout_booking(p_booking_id uuid, p_total numeric, p_method text, p_complete boolean)
returns bookings as $$
declare
  b bookings%rowtype;
  paid_so_far numeric;
  balance numeric;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  select * into b from bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from businesses where id = b.business_id and owner_id = auth.uid()) then
    raise exception 'Not allowed for this booking' using errcode = '42501';
  end if;

  if p_method is null or p_method not in ('cash', 'card', 'benefit') then
    raise exception 'CHECKOUT: choose how the customer paid';
  end if;
  if p_total is null or p_total < 0 or p_total > 1000000 then
    raise exception 'CHECKOUT: enter a valid total';
  end if;
  if b.status in ('pending', 'declined', 'cancelled', 'no_show') then
    raise exception 'CHECKOUT: this booking isn''t active — confirm it first';
  end if;
  if coalesce(b.paid, false) then
    raise exception 'CHECKOUT: this booking is already paid';
  end if;

  p_total := round(p_total, 3);
  select coalesce(sum(case when type = 'refund' then -amount else amount end), 0)
    into paid_so_far
    from booking_payments where booking_id = b.id;

  balance := round(p_total - paid_so_far, 3);
  if balance < 0 then
    raise exception 'CHECKOUT: payments already recorded (BHD %) are more than this total — lower them or raise the total', paid_so_far;
  end if;
  if balance > 0 then
    insert into booking_payments (booking_id, business_id, type, method, amount)
    values (b.id, b.business_id, case when paid_so_far > 0 then 'balance' else 'full' end, p_method, balance);
  end if;

  update bookings set
    amount = p_total,
    paid = true,
    payment_method = p_method,
    status = case when p_complete then 'completed' else status end
  where id = b.id
  returning * into b;

  return b;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

revoke execute on function checkout_booking(uuid, numeric, text, boolean) from public, anon;
grant execute on function checkout_booking(uuid, numeric, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Reviews: owners can REPORT (never delete) a review for Luupa to look at.
-- ---------------------------------------------------------------------------
alter table reviews
  add column if not exists reported_at timestamptz,
  add column if not exists report_reason text;

do $$ begin
  alter table reviews add constraint reviews_report_reason_check check (char_length(report_reason) <= 500);
exception when duplicate_object then null; end $$;

-- Customers can UPDATE their own review (edit text/rating) — the report
-- fields must be pinned there too, or a customer could quietly clear a
-- report on their own review.
create or replace function pin_review_identity_and_moderation_columns()
returns trigger as $$
begin
  if auth.role() != 'service_role' then
    new.business_id := old.business_id;
    new.booking_id := old.booking_id;
    new.customer_id := old.customer_id;
    new.owner_reply := old.owner_reply;
    new.owner_replied_at := old.owner_replied_at;
    new.status := old.status;
    new.reported_at := old.reported_at;
    new.report_reason := old.report_reason;
    if old.owner_replied_at is not null then
      new.rating := old.rating;
      new.body := old.body;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

-- Admin's moderation list sorts reported reviews first.
create index if not exists idx_reviews_reported_at on reviews (reported_at) where reported_at is not null;
