-- Luupa database schema for Supabase
-- Run this in the Supabase SQL editor after creating your project.

create table businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) not null,
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

-- A business owner can view and edit only their own listing, regardless of status
create policy "Owners can view their own listing"
  on businesses for select
  using (auth.uid() = owner_id);

-- WITH CHECK is spelled out explicitly (rather than relying on Postgres's
-- implicit reuse of USING for UPDATE policies) so the "owner can only touch
-- their own row, including after the update" invariant is visible here
-- without having to know that implicit-reuse rule.
create policy "Owners can update their own listing"
  on businesses for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

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
create policy "Users can insert their own business"
  on businesses for insert
  with check (auth.uid() = owner_id);

-- Inquiries: only the business owner can read inquiries sent to them
create policy "Owners can view their own inquiries"
  on inquiries for select
  using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

-- Anyone (even anonymous customers) can submit an inquiry
create policy "Anyone can submit an inquiry"
  on inquiries for insert
  with check (true);

-- Business owners can mark their own inquiries as read
create policy "Owners can update their own inquiries"
  on inquiries for update
  using (
    business_id in (select id from businesses where owner_id = auth.uid())
  )
  with check (
    business_id in (select id from businesses where owner_id = auth.uid())
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
  source text default 'luupa' check (source in ('luupa', 'manual')),
  vehicle_make text,
  vehicle_model text,
  vehicle_plate text,
  payment_method text check (payment_method in ('cash', 'card')),
  created_at timestamptz default now()
);

alter table bookings enable row level security;

create policy "Anyone can submit a booking request"
  on bookings for insert
  with check (true);

create policy "Owners can view their own bookings"
  on bookings for select
  using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

create policy "Owners can update their own bookings"
  on bookings for update
  using (
    business_id in (select id from businesses where owner_id = auth.uid())
  )
  with check (
    business_id in (select id from businesses where owner_id = auth.uid())
  );
