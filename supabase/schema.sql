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
