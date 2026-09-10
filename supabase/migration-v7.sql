-- Luupa migration v7 — run this in your Supabase SQL editor.
-- Adds booking requests: a customer requests a date/time and service, the
-- business confirms or declines from their dashboard. Not a live calendar
-- with slot-blocking yet — that's a bigger future project. This is the
-- right-sized first version: real, but human-reviewed.

create table bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) not null,
  customer_name text not null,
  customer_contact text not null,
  service text,
  preferred_date date,
  preferred_time text,
  note text,
  status text default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  created_at timestamptz default now()
);

alter table bookings enable row level security;

-- Anyone (even anonymous customers) can submit a booking request
create policy "Anyone can submit a booking request"
  on bookings for insert
  with check (true);

-- Only the business owner can see their own booking requests
create policy "Owners can view their own bookings"
  on bookings for select
  using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

-- Only the business owner can confirm/decline their own bookings
create policy "Owners can update their own bookings"
  on bookings for update
  using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );
