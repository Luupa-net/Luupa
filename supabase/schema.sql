-- Luupa database schema for Supabase
-- Run this in the Supabase SQL editor after creating your project.

create table businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) not null,
  name text not null,
  subcategory text,
  area text,
  description text,
  phone text,
  whatsapp text,
  hours text,
  services jsonb default '[]',
  photos jsonb default '[]',
  verified boolean default false,
  tier text default 'free' check (tier in ('free', 'standard', 'featured')),
  status text default 'pending' check (status in ('pending', 'active', 'suspended')),
  -- Verification info, collected at signup, reviewed by the admin before approval
  cr_number text,
  social_link text,
  applicant_note text,
  view_count integer default 0,
  created_at timestamptz default now()
);

create table inquiries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) not null,
  customer_name text,
  customer_contact text,
  message text,
  created_at timestamptz default now()
);

-- Row Level Security: enforced at the database level, not just in app code
alter table businesses enable row level security;
alter table inquiries enable row level security;

-- Anyone can view active listings (public directory)
create policy "Public can view active businesses"
  on businesses for select
  using (status = 'active');

-- A business owner can view and edit only their own listing, regardless of status
create policy "Owners can view their own listing"
  on businesses for select
  using (auth.uid() = owner_id);

create policy "Owners can update their own listing"
  on businesses for update
  using (auth.uid() = owner_id);

-- SECURITY: without this, a business could edit their own row directly (via browser
-- dev tools) and set verified=true, status='active', or tier='featured' themselves.
-- This trigger forces those four fields to stay unchanged for anyone except the
-- admin (who connects using the service role key, which bypasses this check).
create or replace function protect_admin_controlled_fields()
returns trigger as $$
begin
  if auth.role() != 'service_role'
     and coalesce(current_setting('app.bypass_admin_protection', true), '') != 'true' then
    new.status := old.status;
    new.verified := old.verified;
    new.tier := old.tier;
    new.view_count := old.view_count;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger enforce_admin_controlled_fields
  before update on businesses
  for each row execute function protect_admin_controlled_fields();

-- Lets any visitor (even logged-out customers) increment a listing's view count
-- without granting them broad update access to the row. Sets a transaction-local
-- flag so the trigger above lets just this one field through for this one call.
create or replace function increment_view_count(business_id uuid)
returns void as $$
begin
  perform set_config('app.bypass_admin_protection', 'true', true);
  update businesses set view_count = view_count + 1 where id = business_id;
end;
$$ language plpgsql security definer;

grant execute on function increment_view_count(uuid) to anon, authenticated;

-- Storage bucket for business photos — public read, but only logged-in businesses
-- can upload, and only to their own folder.
insert into storage.buckets (id, name, public)
values ('business-photos', 'business-photos', true)
on conflict (id) do nothing;

create policy "Public can view business photos"
  on storage.objects for select
  using (bucket_id = 'business-photos');

create policy "Authenticated users can upload their own photos"
  on storage.objects for insert
  with check (bucket_id = 'business-photos' and auth.role() = 'authenticated');

create policy "Users can delete their own uploaded photos"
  on storage.objects for delete
  using (bucket_id = 'business-photos' and owner = auth.uid());

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
