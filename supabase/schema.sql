-- Luupa database schema for Supabase
-- Run this in the Supabase SQL editor after creating your project.

create table businesses (
  id uuid primary key default gen_random_uuid(),
  -- One listing per owner — enforced here, not just assumed by the app's
  -- insert flow, so a duplicate/retried signup can't silently create a
  -- second row for the same owner (which would break every `.single()`
  -- lookup the dashboard and bookings pages do by owner_id).
  owner_id uuid references auth.users(id) unique not null,
  name text not null,
  logo_url text,
  subcategory text,
  subcategories text[] default '{}',
  area text,
  areas text[] default '{}',
  description text,
  phone text,
  whatsapp text,
  hours text,
  services jsonb default '[]',
  photos jsonb default '[]',
  verified boolean default false,
  is_mobile boolean default false,
  payment_qr_url text,
  verified_until timestamptz,
  tier text default 'free' check (tier in ('free', 'standard', 'featured')),
  status text default 'pending' check (status in ('pending', 'active', 'suspended')),
  cr_number text,
  social_link text,
  applicant_note text,
  view_count integer default 0,
  pending_changes jsonb,
  created_at timestamptz default now()
);

create table inquiries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) not null,
  customer_name text,
  customer_contact text,
  message text,
  read boolean default false,
  archived boolean default false,
  created_at timestamptz default now()
);

create index idx_inquiries_business_id on inquiries(business_id);

-- Row Level Security: enforced at the database level, not just in app code
alter table businesses enable row level security;
alter table inquiries enable row level security;

-- SECURITY: RLS policies restrict which ROWS a role can see, never which
-- COLUMNS — a row policy like `using (status = 'active')` still hands back
-- every column, including admin-only ones (cr_number, applicant_note,
-- owner_id, social_link, payment_qr_url, pending_changes) to anyone with the
-- public anon key, via a direct REST call, regardless of what the app's own
-- queries ask for. To expose only the fields that are actually meant to be
-- public, we route public reads through a view that projects down to a safe
-- column list, and grant that instead of a row policy on the base table.
--
-- This view intentionally does NOT use `security_invoker` — it runs with the
-- privileges of its owner so it can read the base table itself, then hands
-- back only the columns listed below to whichever role queries the view.
create view businesses_public as
  select
    id, status, name, logo_url, subcategories, areas, description,
    phone, whatsapp, hours, services, photos, is_mobile,
    verified, verified_until, tier
  from businesses
  where status = 'active';

grant select on businesses_public to anon, authenticated;

-- A business owner can view and edit only their own listing, regardless of status.
-- auth.uid() is wrapped in a `select` so Postgres evaluates it once per
-- statement instead of once per row (see the Supabase RLS performance docs).
create policy "Owners can view their own listing"
  on businesses for select
  using ((select auth.uid()) = owner_id);

-- WITH CHECK is spelled out explicitly (rather than relying on Postgres's
-- implicit reuse of USING for UPDATE policies) so the "owner can only touch
-- their own row, including after the update" invariant is visible here
-- without having to know that implicit-reuse rule.
create policy "Owners can update their own listing"
  on businesses for update
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- SECURITY: without this, a business could edit their own row directly (via browser
-- dev tools) and set verified=true, status='active', or tier='featured' themselves.
-- This trigger forces those four fields to stay unchanged for anyone except the
-- admin (who connects using the service role key, which bypasses this check).
--
-- SECURITY: it also enforces the pending-changes-for-review workflow at the
-- database level. The dashboard UI (app/business/dashboard/page.tsx) already
-- routes edits to PUBLIC_FIELDS (lib/businessFields.ts) into pending_changes
-- instead of writing them live once a listing is status = 'active' — but that
-- was only a client-side convention. The "Owners can update their own
-- listing" RLS policy has no column restriction, so without this an owner
-- could call the Supabase REST API directly with their own JWT and overwrite
-- a live listing's public content instantly, skipping admin review entirely.
-- For any non-service-role update to a row that was already 'active', this
-- diverts changes to those columns into pending_changes (merging with
-- whatever pending_changes the caller sent, or the existing draft if they
-- didn't touch that column) and resets the live columns back to their old
-- values — regardless of which columns the caller directly targeted.
create or replace function protect_admin_controlled_fields()
returns trigger as $$
declare
  changed_public jsonb := '{}'::jsonb;
begin
  if auth.role() != 'service_role'
     and coalesce(current_setting('app.bypass_admin_protection', true), '') != 'true' then
    new.status := old.status;
    new.verified := old.verified;
    new.verified_until := old.verified_until;
    new.tier := old.tier;
    new.view_count := old.view_count;

    if old.status = 'active' then
      if new.name is distinct from old.name then
        changed_public := changed_public || jsonb_build_object('name', new.name);
      end if;
      if new.logo_url is distinct from old.logo_url then
        changed_public := changed_public || jsonb_build_object('logo_url', new.logo_url);
      end if;
      if new.subcategories is distinct from old.subcategories then
        changed_public := changed_public || jsonb_build_object('subcategories', to_jsonb(new.subcategories));
      end if;
      if new.areas is distinct from old.areas then
        changed_public := changed_public || jsonb_build_object('areas', to_jsonb(new.areas));
      end if;
      if new.phone is distinct from old.phone then
        changed_public := changed_public || jsonb_build_object('phone', new.phone);
      end if;
      if new.whatsapp is distinct from old.whatsapp then
        changed_public := changed_public || jsonb_build_object('whatsapp', new.whatsapp);
      end if;
      if new.hours is distinct from old.hours then
        changed_public := changed_public || jsonb_build_object('hours', new.hours);
      end if;
      if new.description is distinct from old.description then
        changed_public := changed_public || jsonb_build_object('description', new.description);
      end if;
      if new.services is distinct from old.services then
        changed_public := changed_public || jsonb_build_object('services', new.services);
      end if;
      if new.photos is distinct from old.photos then
        changed_public := changed_public || jsonb_build_object('photos', new.photos);
      end if;
      if new.is_mobile is distinct from old.is_mobile then
        changed_public := changed_public || jsonb_build_object('is_mobile', new.is_mobile);
      end if;

      -- Only touch pending_changes if a PUBLIC_FIELDS column actually
      -- changed in this UPDATE. This keeps the legitimate dashboard flow
      -- intact: when a business submits an edit, it sets NEW.pending_changes
      -- directly to its full proposed object and leaves the live columns
      -- alone, so changed_public stays empty and NEW.pending_changes passes
      -- through untouched below.
      if changed_public != '{}'::jsonb then
        new.pending_changes := coalesce(new.pending_changes, '{}'::jsonb) || changed_public;
      end if;

      -- Reset the live columns — the change now lives only in pending_changes.
      new.name := old.name;
      new.logo_url := old.logo_url;
      new.subcategories := old.subcategories;
      new.areas := old.areas;
      new.phone := old.phone;
      new.whatsapp := old.whatsapp;
      new.hours := old.hours;
      new.description := old.description;
      new.services := old.services;
      new.photos := old.photos;
      new.is_mobile := old.is_mobile;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

create trigger enforce_admin_controlled_fields
  before update on businesses
  for each row execute function protect_admin_controlled_fields();

-- SECURITY: this is a trigger function only (relies on NEW/OLD) and was
-- never meant to be called directly, but Postgres and Supabase's own default
-- privileges grant EXECUTE to PUBLIC and to anon/authenticated on function
-- creation, exposing it at /rest/v1/rpc/protect_admin_controlled_fields.
-- Trigger invocation doesn't depend on the invoking role holding EXECUTE on
-- the trigger function itself, so revoking direct EXECUTE closes that
-- needless surface without affecting the trigger.
revoke execute on function protect_admin_controlled_fields() from public;
revoke execute on function protect_admin_controlled_fields() from anon, authenticated;

-- Lets any visitor (even logged-out customers) increment a listing's view count
-- without granting them broad update access to the row. Sets a transaction-local
-- flag so the trigger above lets just this one field through for this one call.
create or replace function increment_view_count(business_id uuid)
returns void as $$
begin
  perform set_config('app.bypass_admin_protection', 'true', true);
  update businesses set view_count = view_count + 1 where id = business_id;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

grant execute on function increment_view_count(uuid) to anon, authenticated;

-- Storage bucket for business photos — public read, but only logged-in businesses
-- can upload, and only to their own folder.
insert into storage.buckets (id, name, public)
values ('business-photos', 'business-photos', true)
on conflict (id) do nothing;

create policy "Public can view business photos"
  on storage.objects for select
  using (bucket_id = 'business-photos');

-- SECURITY: restricts uploads to the user's own folder (matches the delete
-- policy below) — without this, any logged-in business could upload into
-- another business's photo folder.
create policy "Authenticated users can upload only to their own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'business-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own uploaded photos"
  on storage.objects for delete
  using (bucket_id = 'business-photos' and owner = auth.uid());

-- Real enforcement, not just the client-side checks — closes a gap where
-- someone could call the storage API directly with an oversized or non-image file.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'business-photos';

-- A newly signed-up user can create exactly one listing tied to themselves
-- (also enforced by the unique constraint on businesses.owner_id above).
create policy "Users can insert their own business"
  on businesses for insert
  with check ((select auth.uid()) = owner_id);

-- Inquiries: only the business owner can read inquiries sent to them
create policy "Owners can view their own inquiries"
  on inquiries for select
  using (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
  );

-- Anyone (even anonymous customers) can submit an inquiry
create policy "Anyone can submit an inquiry"
  on inquiries for insert
  with check (true);

-- Business owners can mark their own inquiries as read
create policy "Owners can update their own inquiries"
  on inquiries for update
  using (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
  )
  with check (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
  );

-- Booking requests — customer requests a date/time, business confirms or
-- declines. Not a live slot-blocking calendar yet, human-reviewed for now.
create table bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) not null,
  customer_name text not null,
  customer_contact text not null,
  customer_email text,
  service text,
  preferred_date date,
  preferred_time text,
  note text,
  status text default 'pending' check (status in ('pending', 'confirmed', 'declined', 'arrived', 'in_progress', 'completed', 'no_show', 'cancelled')),
  paid boolean default false,
  amount numeric(10,2),
  source text default 'luupa' check (source in ('luupa', 'manual')),
  vehicle_make text,
  vehicle_model text,
  vehicle_plate text,
  payment_method text check (payment_method in ('cash', 'card', 'benefit')),
  created_at timestamptz default now(),
  discount_amount numeric(10,2) default 0,
  discount_note text,
  reminder_sent_at timestamptz
  -- assigned_staff_id is added further down, via alter table, once the
  -- staff table it references has been created — see the "v21" block below.
);

alter table bookings enable row level security;

create index idx_bookings_business_id on bookings(business_id);

-- Customer accounts — lets a customer reuse their name/phone/email across
-- every business they book with, instead of retyping it each time.
create table customers (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  created_at timestamptz default now()
);

alter table customers enable row level security;

create policy "Customers can view their own profile"
  on customers for select
  using ((select auth.uid()) = id);

create policy "Customers can create their own profile"
  on customers for insert
  with check ((select auth.uid()) = id);

create policy "Customers can update their own profile"
  on customers for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Links a booking back to the customer account that made it (nullable — a
-- business's own manually-entered walk-ins/phone bookings have no customer
-- account behind them).
alter table bookings add column customer_id uuid references customers(id);
create index idx_bookings_customer_id on bookings(customer_id);

-- SECURITY: a `with check (true)` insert policy here would let anyone with
-- the anon key create a booking directly via the REST API for any
-- business_id, with any status (including 'confirmed', skipping the
-- business's review step), with no auth required. This requires either a
-- real authenticated customer inserting their own pending request, or the
-- caller actually owning the business for a manual/walk-in entry — merged
-- into one policy (rather than two) since the two conditions are mutually
-- exclusive on `source` and Postgres otherwise evaluates every permissive
-- policy on a table for every insert.
create policy "Owners and customers can insert their own bookings"
  on bookings for insert
  with check (
    (
      source = 'luupa'
      and status = 'pending'
      and (select auth.uid()) is not null
      and customer_id = (select auth.uid())
    )
    or (
      source = 'manual'
      and business_id in (select id from businesses where owner_id = (select auth.uid()))
    )
  );

-- Same merge for SELECT: a business sees its own bookings, a customer sees
-- bookings they made — one OR'd policy instead of two always-evaluated ones.
create policy "Owners and customers can view relevant bookings"
  on bookings for select
  using (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
    or (select auth.uid()) = customer_id
  );

create policy "Owners can update their own bookings"
  on bookings for update
  using (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
  )
  with check (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
  );

-- SECURITY: the policy above only ever constrained business_id, never
-- customer_id — so without this, a business owner could UPDATE their own
-- booking rows and reassign customer_id to an arbitrary UUID, which,
-- combined with "Owners and customers can view relevant bookings" above
-- (whose customer half uses auth.uid() = customer_id), would make a
-- fabricated booking appear in a stranger's own booking list. RLS's WITH
-- CHECK can't reference the old value of a column, so this pins customer_id
-- via trigger instead — the
-- same pattern used for businesses (see protect_admin_controlled_fields()
-- below) — without touching any other column a business legitimately needs
-- to update (status, payment info, notes, vehicle details, etc).
create or replace function lock_booking_customer_id()
returns trigger as $$
begin
  if auth.role() != 'service_role' then
    new.customer_id := old.customer_id;
  end if;
  return new;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

revoke execute on function lock_booking_customer_id() from public;
revoke execute on function lock_booking_customer_id() from anon, authenticated;

create trigger enforce_booking_customer_id_immutable
  before update on bookings
  for each row execute function lock_booking_customer_id();

-- ═══════════════════════════════════════════════════════════════════════════
-- v21: business-side ERP — staff, line-item services, a payment ledger, a
-- per-business customer-notes layer, saved customer vehicles, and a status
-- audit trail. See migration-v21.sql for the idempotent version actually
-- run against the live database; this is the consolidated/from-scratch form.
-- ═══════════════════════════════════════════════════════════════════════════

-- Audit trail of every status change on a booking. Populated only by the
-- trigger below (security definer) — no insert/update/delete policy is
-- granted to anon/authenticated, so the trail can't be forged or edited via
-- the REST API even by the booking's own owner.
create table booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) not null,
  business_id uuid references businesses(id) not null,
  old_status text,
  new_status text not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz default now()
);

alter table booking_status_history enable row level security;

create index idx_booking_status_history_booking_id on booking_status_history(booking_id);
create index idx_booking_status_history_business_id on booking_status_history(business_id);
create index idx_booking_status_history_changed_by on booking_status_history(changed_by);

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

create trigger log_booking_status_change_trigger
  after insert or update on bookings
  for each row execute function log_booking_status_change();

-- Per-business staff/technician roster.
create table staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) not null,
  name text not null,
  phone text,
  role text,
  active boolean default true,
  created_at timestamptz default now()
);

alter table staff enable row level security;

create index idx_staff_business_id on staff(business_id);

create policy "Owners can view their own staff"
  on staff for select
  using (business_id in (select id from businesses where owner_id = (select auth.uid())));

create policy "Owners can insert their own staff"
  on staff for insert
  with check (business_id in (select id from businesses where owner_id = (select auth.uid())));

create policy "Owners can update their own staff"
  on staff for update
  using (business_id in (select id from businesses where owner_id = (select auth.uid())))
  with check (business_id in (select id from businesses where owner_id = (select auth.uid())));

create policy "Owners can delete their own staff"
  on staff for delete
  using (business_id in (select id from businesses where owner_id = (select auth.uid())));

-- Who's servicing a booking. staff.id is an existence-only FK, and an owner
-- already has full column-level UPDATE rights on their own booking rows, so
-- the trigger below stops assigned_staff_id from ever pointing at another
-- business's staff row (WITH CHECK alone can't validate cross-table
-- ownership consistency).
-- on delete set null: removing a staff member must never affect the booking
-- itself — it should just un-assign them, not block the deletion.
alter table bookings add column assigned_staff_id uuid references staff(id) on delete set null;
create index idx_bookings_assigned_staff_id on bookings(assigned_staff_id);

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

create trigger enforce_booking_staff_assignment
  before insert or update on bookings
  for each row execute function validate_booking_staff_assignment();

-- Multi-line services per booking. Additive: bookings.service stays as the
-- simple free-text summary field for bookings that never use line items.
create table booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) not null,
  business_id uuid references businesses(id) not null,
  description text not null,
  qty integer not null default 1,
  unit_price numeric(10,2) not null default 0,
  created_at timestamptz default now()
);

alter table booking_items enable row level security;

create index idx_booking_items_booking_id on booking_items(booking_id);
create index idx_booking_items_business_id on booking_items(business_id);

create policy "Owners can view their own booking items"
  on booking_items for select
  using (business_id in (select id from businesses where owner_id = (select auth.uid())));

create policy "Owners can insert items on their own bookings"
  on booking_items for insert
  with check (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
    and booking_id in (select id from bookings where business_id = booking_items.business_id)
  );

create policy "Owners can update their own booking items"
  on booking_items for update
  using (business_id in (select id from businesses where owner_id = (select auth.uid())))
  with check (business_id in (select id from businesses where owner_id = (select auth.uid())));

create policy "Owners can delete their own booking items"
  on booking_items for delete
  using (business_id in (select id from businesses where owner_id = (select auth.uid())));

-- Deposit/balance/full/refund ledger. bookings.paid/amount stay as the
-- simple display fields — this table is the source of truth going forward
-- for anything that wants a deposit-vs-balance breakdown.
create table booking_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) not null,
  business_id uuid references businesses(id) not null,
  type text not null check (type in ('deposit', 'balance', 'full', 'refund')),
  method text check (method in ('cash', 'card', 'benefit')),
  amount numeric(10,2) not null,
  created_at timestamptz default now()
);

alter table booking_payments enable row level security;

create index idx_booking_payments_booking_id on booking_payments(booking_id);
create index idx_booking_payments_business_id on booking_payments(business_id);

create policy "Owners can view their own booking payments"
  on booking_payments for select
  using (business_id in (select id from businesses where owner_id = (select auth.uid())));

create policy "Owners can insert payments on their own bookings"
  on booking_payments for insert
  with check (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
    and booking_id in (select id from bookings where business_id = booking_payments.business_id)
  );

create policy "Owners can update their own booking payments"
  on booking_payments for update
  using (business_id in (select id from businesses where owner_id = (select auth.uid())))
  with check (business_id in (select id from businesses where owner_id = (select auth.uid())));

create policy "Owners can delete their own booking payments"
  on booking_payments for delete
  using (business_id in (select id from businesses where owner_id = (select auth.uid())));

-- Per-business tags/notes on a customer, keyed by customer_id OR
-- customer_phone so it works for both linked accounts and walk-ins. Scoped
-- per-business because customers is platform-wide — one business's tag on a
-- shared customer must never be visible to another business.
create table customer_notes (
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

alter table customer_notes enable row level security;

create unique index idx_customer_notes_unique_customer
  on customer_notes(business_id, customer_id) where customer_id is not null;
create unique index idx_customer_notes_unique_phone
  on customer_notes(business_id, customer_phone) where customer_id is null and customer_phone is not null;
create index idx_customer_notes_business_id on customer_notes(business_id);
create index idx_customer_notes_customer_id on customer_notes(customer_id);

create policy "Owners can view their own customer notes"
  on customer_notes for select
  using (business_id in (select id from businesses where owner_id = (select auth.uid())));

-- Requires the business to already have a real booking with this
-- customer_id/customer_phone — an owner can't tag or write a note about an
-- arbitrary customer they never actually served.
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

create policy "Owners can update their own customer notes"
  on customer_notes for update
  using (business_id in (select id from businesses where owner_id = (select auth.uid())))
  with check (business_id in (select id from businesses where owner_id = (select auth.uid())));

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

create trigger touch_customer_notes_updated_at_trigger
  before update on customer_notes
  for each row execute function touch_customer_notes_updated_at();

-- Customer's own saved vehicles. Self-only RLS, same trust model as the
-- customers table itself — USING/WITH CHECK both pin to auth.uid() on every
-- clause, so no lock trigger is needed the way bookings.customer_id needed one.
create table vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) not null,
  make text,
  model text,
  plate text,
  nickname text,
  created_at timestamptz default now()
);

alter table vehicles enable row level security;

create index idx_vehicles_customer_id on vehicles(customer_id);

create policy "Customers can view their own vehicles"
  on vehicles for select
  using ((select auth.uid()) = customer_id);

create policy "Customers can insert their own vehicles"
  on vehicles for insert
  with check ((select auth.uid()) = customer_id);

create policy "Customers can update their own vehicles"
  on vehicles for update
  using ((select auth.uid()) = customer_id)
  with check ((select auth.uid()) = customer_id);

create policy "Customers can delete their own vehicles"
  on vehicles for delete
  using ((select auth.uid()) = customer_id);
