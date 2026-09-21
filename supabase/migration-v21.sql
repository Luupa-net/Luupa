-- v21: business-side ERP upgrade — staff, line-item services, a payment
-- ledger, a per-business customer-notes layer, saved customer vehicles, a
-- status audit trail, and the columns/publications needed for automated
-- reminders and live (Realtime) sync. Every new table gets RLS enabled and
-- owner-scoped policies that mirror the
-- `business_id in (select id from businesses where owner_id = (select auth.uid()))`
-- pattern already used throughout schema.sql — nothing here changes who can
-- see or write existing rows on businesses/inquiries/bookings/customers.

-- ─────────────────────────── booking_status_history ───────────────────────
-- Audit trail of every status change on a booking. Populated ONLY by the
-- trigger below (security definer, search_path pinned) — deliberately no
-- insert/update/delete policy is granted to anon/authenticated, so with RLS
-- enabled the table is select-only from the REST API even for a booking's
-- own owner. That means the trail can't be forged or edited after the fact,
-- unlike a plain owner-writable table would allow.
create table if not exists booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) not null,
  business_id uuid references businesses(id) not null,
  old_status text,
  new_status text not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz default now()
);

create index if not exists idx_booking_status_history_booking_id on booking_status_history(booking_id);
create index if not exists idx_booking_status_history_business_id on booking_status_history(business_id);
create index if not exists idx_booking_status_history_changed_by on booking_status_history(changed_by);

alter table booking_status_history enable row level security;

drop policy if exists "Owners can view their own booking status history" on booking_status_history;
create policy "Owners can view their own booking status history"
  on booking_status_history for select
  using (business_id in (select id from businesses where owner_id = (select auth.uid())));

create or replace function log_booking_status_change()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into booking_status_history (booking_id, business_id, old_status, new_status, changed_by)
    values (new.id, new.business_id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into booking_status_history (booking_id, business_id, old_status, new_status, changed_by)
    values (new.id, new.business_id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

revoke execute on function log_booking_status_change() from public;
revoke execute on function log_booking_status_change() from anon, authenticated;

drop trigger if exists log_booking_status_change_trigger on bookings;
create trigger log_booking_status_change_trigger
  after insert or update on bookings
  for each row execute function log_booking_status_change();

-- ─────────────────────────────────── staff ─────────────────────────────────
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) not null,
  name text not null,
  phone text,
  role text,
  active boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_staff_business_id on staff(business_id);
alter table staff enable row level security;

drop policy if exists "Owners can view their own staff" on staff;
create policy "Owners can view their own staff"
  on staff for select
  using (business_id in (select id from businesses where owner_id = (select auth.uid())));

drop policy if exists "Owners can insert their own staff" on staff;
create policy "Owners can insert their own staff"
  on staff for insert
  with check (business_id in (select id from businesses where owner_id = (select auth.uid())));

drop policy if exists "Owners can update their own staff" on staff;
create policy "Owners can update their own staff"
  on staff for update
  using (business_id in (select id from businesses where owner_id = (select auth.uid())))
  with check (business_id in (select id from businesses where owner_id = (select auth.uid())));

drop policy if exists "Owners can delete their own staff" on staff;
create policy "Owners can delete their own staff"
  on staff for delete
  using (business_id in (select id from businesses where owner_id = (select auth.uid())));

-- bookings.assigned_staff_id — who's servicing a booking. staff.id is just a
-- UUID FK (existence-only), and an owner already has full column-level
-- UPDATE rights on their own booking rows, so nothing stops them from
-- pointing assigned_staff_id at another business's staff row (a data-
-- integrity bug, not a read leak, but a real one — a booking could display
-- "assigned to [someone else's staff]"). Closed the same way v18 closed the
-- analogous customer_id gap: a trigger, since WITH CHECK can't validate
-- cross-row consistency against another table's ownership on its own.
-- on delete set null: removing a staff member must never affect the booking
-- itself — it should just un-assign them, not block the deletion or touch
-- any other booking data.
alter table bookings add column if not exists assigned_staff_id uuid references staff(id) on delete set null;
create index if not exists idx_bookings_assigned_staff_id on bookings(assigned_staff_id);

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'bookings'::regclass and conname = 'bookings_assigned_staff_id_fkey' and confdeltype != 'n'
  ) then
    alter table bookings drop constraint bookings_assigned_staff_id_fkey;
    alter table bookings add constraint bookings_assigned_staff_id_fkey
      foreign key (assigned_staff_id) references staff(id) on delete set null;
  end if;
end $$;

create or replace function validate_booking_staff_assignment()
returns trigger as $$
begin
  if new.assigned_staff_id is not null and not exists (
    select 1 from staff where id = new.assigned_staff_id and business_id = new.business_id
  ) then
    raise exception 'assigned_staff_id must belong to the same business as the booking';
  end if;
  return new;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

revoke execute on function validate_booking_staff_assignment() from public;
revoke execute on function validate_booking_staff_assignment() from anon, authenticated;

drop trigger if exists enforce_booking_staff_assignment on bookings;
create trigger enforce_booking_staff_assignment
  before insert or update on bookings
  for each row execute function validate_booking_staff_assignment();

-- ────────────────────────────── booking_items ──────────────────────────────
-- Multi-line services per booking. Additive: bookings.service stays as the
-- simple free-text summary field for bookings that never use line items.
create table if not exists booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) not null,
  business_id uuid references businesses(id) not null,
  description text not null,
  qty integer not null default 1,
  unit_price numeric(10,2) not null default 0,
  created_at timestamptz default now()
);

create index if not exists idx_booking_items_booking_id on booking_items(booking_id);
create index if not exists idx_booking_items_business_id on booking_items(business_id);
alter table booking_items enable row level security;

drop policy if exists "Owners can view their own booking items" on booking_items;
create policy "Owners can view their own booking items"
  on booking_items for select
  using (business_id in (select id from businesses where owner_id = (select auth.uid())));

-- INSERT is checked against the real business_id of booking_id, not just
-- whatever business_id the caller sends, so a spoofed pairing can't attach
-- an item to a booking that isn't actually the caller's own.
drop policy if exists "Owners can insert items on their own bookings" on booking_items;
create policy "Owners can insert items on their own bookings"
  on booking_items for insert
  with check (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
    and booking_id in (select id from bookings where business_id = booking_items.business_id)
  );

drop policy if exists "Owners can update their own booking items" on booking_items;
create policy "Owners can update their own booking items"
  on booking_items for update
  using (business_id in (select id from businesses where owner_id = (select auth.uid())))
  with check (business_id in (select id from businesses where owner_id = (select auth.uid())));

drop policy if exists "Owners can delete their own booking items" on booking_items;
create policy "Owners can delete their own booking items"
  on booking_items for delete
  using (business_id in (select id from businesses where owner_id = (select auth.uid())));

-- ───────────────────────────── booking_payments ────────────────────────────
-- Deposit/balance/full/refund ledger. bookings.paid/amount stay as the
-- simple display fields (revenueThisMonth etc. keep reading those, untouched)
-- — this table is the source of truth going forward for anything that wants
-- a deposit-vs-balance breakdown.
create table if not exists booking_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) not null,
  business_id uuid references businesses(id) not null,
  type text not null check (type in ('deposit', 'balance', 'full', 'refund')),
  method text check (method in ('cash', 'card')),
  amount numeric(10,2) not null,
  created_at timestamptz default now()
);

create index if not exists idx_booking_payments_booking_id on booking_payments(booking_id);
create index if not exists idx_booking_payments_business_id on booking_payments(business_id);
alter table booking_payments enable row level security;

drop policy if exists "Owners can view their own booking payments" on booking_payments;
create policy "Owners can view their own booking payments"
  on booking_payments for select
  using (business_id in (select id from businesses where owner_id = (select auth.uid())));

drop policy if exists "Owners can insert payments on their own bookings" on booking_payments;
create policy "Owners can insert payments on their own bookings"
  on booking_payments for insert
  with check (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
    and booking_id in (select id from bookings where business_id = booking_payments.business_id)
  );

drop policy if exists "Owners can update their own booking payments" on booking_payments;
create policy "Owners can update their own booking payments"
  on booking_payments for update
  using (business_id in (select id from businesses where owner_id = (select auth.uid())))
  with check (business_id in (select id from businesses where owner_id = (select auth.uid())));

drop policy if exists "Owners can delete their own booking payments" on booking_payments;
create policy "Owners can delete their own booking payments"
  on booking_payments for delete
  using (business_id in (select id from businesses where owner_id = (select auth.uid())));

-- ─────────────────────────── bookings: discount fields ─────────────────────
-- Flat manual discount. NOT a promo-code validation engine (backlog item) —
-- already covered by the existing "Owners can update their own bookings"
-- policy, so no RLS change needed here, same as how v19 added `amount`.
alter table bookings add column if not exists discount_amount numeric(10,2) default 0;
alter table bookings add column if not exists discount_note text;
comment on column bookings.discount_amount is 'Flat manual discount in BHD. No promo-code validation engine — that is a separate backlog item, not part of this phase.';

-- ─────────────────────────────── customer_notes ────────────────────────────
-- Per-business tags/notes on a customer, keyed by customer_id OR
-- customer_phone so it works for both linked accounts and walk-ins (many
-- bookings have customer_id null). Scoped per-business because `customers`
-- is platform-wide — a customer can book with multiple businesses, and one
-- business's "VIP"/"at risk" tag on them must never be visible to another.
create table if not exists customer_notes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) not null,
  customer_id uuid references customers(id),
  customer_phone text,
  tag text,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint customer_notes_identity_check check (customer_id is not null or customer_phone is not null)
);

create unique index if not exists idx_customer_notes_unique_customer
  on customer_notes(business_id, customer_id) where customer_id is not null;
create unique index if not exists idx_customer_notes_unique_phone
  on customer_notes(business_id, customer_phone) where customer_id is null and customer_phone is not null;
create index if not exists idx_customer_notes_business_id on customer_notes(business_id);
create index if not exists idx_customer_notes_customer_id on customer_notes(customer_id);

alter table customer_notes enable row level security;

drop policy if exists "Owners can view their own customer notes" on customer_notes;
create policy "Owners can view their own customer notes"
  on customer_notes for select
  using (business_id in (select id from businesses where owner_id = (select auth.uid())));

-- Requires the business to already have a real booking with this
-- customer_id/customer_phone — an owner can't tag or write a note about an
-- arbitrary customer they never actually served.
drop policy if exists "Owners can insert notes for customers they've actually served" on customer_notes;
create policy "Owners can insert notes for customers they've actually served"
  on customer_notes for insert
  with check (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
    and (
      (customer_id is not null and exists (
        select 1 from bookings where bookings.business_id = customer_notes.business_id and bookings.customer_id = customer_notes.customer_id
      ))
      or
      (customer_id is null and customer_phone is not null and exists (
        select 1 from bookings where bookings.business_id = customer_notes.business_id and bookings.customer_contact = customer_notes.customer_phone
      ))
    )
  );

drop policy if exists "Owners can update their own customer notes" on customer_notes;
create policy "Owners can update their own customer notes"
  on customer_notes for update
  using (business_id in (select id from businesses where owner_id = (select auth.uid())))
  with check (business_id in (select id from businesses where owner_id = (select auth.uid())));

drop policy if exists "Owners can delete their own customer notes" on customer_notes;
create policy "Owners can delete their own customer notes"
  on customer_notes for delete
  using (business_id in (select id from businesses where owner_id = (select auth.uid())));

create or replace function touch_customer_notes_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

revoke execute on function touch_customer_notes_updated_at() from public;
revoke execute on function touch_customer_notes_updated_at() from anon, authenticated;

drop trigger if exists touch_customer_notes_updated_at_trigger on customer_notes;
create trigger touch_customer_notes_updated_at_trigger
  before update on customer_notes
  for each row execute function touch_customer_notes_updated_at();

-- ───────────────────────────────── vehicles ────────────────────────────────
-- Customer's own saved vehicles. Self-only RLS, same trust model as the
-- customers table itself — no lock trigger needed since USING/WITH CHECK
-- both pin to auth.uid() on every clause, so there's no scenario where
-- someone who isn't the row's own customer can touch it at all.
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) not null,
  make text,
  model text,
  plate text,
  nickname text,
  created_at timestamptz default now()
);

create index if not exists idx_vehicles_customer_id on vehicles(customer_id);
alter table vehicles enable row level security;

drop policy if exists "Customers can view their own vehicles" on vehicles;
create policy "Customers can view their own vehicles"
  on vehicles for select
  using ((select auth.uid()) = customer_id);

drop policy if exists "Customers can insert their own vehicles" on vehicles;
create policy "Customers can insert their own vehicles"
  on vehicles for insert
  with check ((select auth.uid()) = customer_id);

drop policy if exists "Customers can update their own vehicles" on vehicles;
create policy "Customers can update their own vehicles"
  on vehicles for update
  using ((select auth.uid()) = customer_id)
  with check ((select auth.uid()) = customer_id);

drop policy if exists "Customers can delete their own vehicles" on vehicles;
create policy "Customers can delete their own vehicles"
  on vehicles for delete
  using ((select auth.uid()) = customer_id);

-- ────────────────────────── bookings: reminder tracking ────────────────────
alter table bookings add column if not exists reminder_sent_at timestamptz;
comment on column bookings.reminder_sent_at is 'Set once a reminder email has been sent for this booking — the cron claims a row with an UPDATE ... WHERE reminder_sent_at IS NULL before sending, so overlapping/retried runs can''t double-send.';

-- ────────────────────────────────── realtime ───────────────────────────────
-- bookings already has RLS enabled with an owner/customer-scoped SELECT
-- policy, so postgres_changes broadcasts are naturally filtered per
-- connection by that same policy. Also confirm in the Supabase dashboard
-- that "broadcast changes only to users allowed by RLS" is enabled for this
-- project — that's a project-level setting, not expressible in SQL.
-- Guarded with a lookup against pg_publication_tables since
-- ALTER PUBLICATION ... ADD TABLE errors if the table is already a member
-- (idempotent re-runs of this migration would otherwise fail here).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'booking_status_history'
  ) then
    alter publication supabase_realtime add table booking_status_history;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table bookings;
  end if;
end $$;
