-- Luupa migration v17 — run this in your Supabase SQL editor.
-- Adds customer accounts so a customer can book once and reuse their name/
-- phone/email on every business, instead of retyping it each time.
--
-- SECURITY: this also closes a real gap in the existing bookings table. The
-- old "Anyone can submit a booking request" policy had `with check (true)` —
-- meaning anyone with the anon key could insert a booking row directly via
-- the REST API for ANY business_id, with ANY status (including 'confirmed',
-- skipping the business's review step entirely), with no auth required. The
-- app's own UI never did that, but RLS is supposed to hold even when the UI
-- is bypassed. The new policies below require a real authenticated customer
-- (auth.uid() = customer_id) for customer-initiated bookings, and require
-- the caller to actually own the business for manual/walk-in bookings.

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
  using (auth.uid() = id);

create policy "Customers can create their own profile"
  on customers for insert
  with check (auth.uid() = id);

create policy "Customers can update their own profile"
  on customers for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Links a booking back to the customer account that made it (nullable — a
-- business's own manually-entered walk-ins/phone bookings have no customer
-- account behind them).
alter table bookings add column customer_id uuid references customers(id);

drop policy "Anyone can submit a booking request" on bookings;

-- A logged-in customer can only ever insert a pending booking under their
-- own account — never on someone else's behalf, and never pre-confirmed.
create policy "Customers can submit a booking request"
  on bookings for insert
  with check (
    source = 'luupa'
    and status = 'pending'
    and auth.uid() is not null
    and customer_id = auth.uid()
  );

-- A business can only log manual/walk-in bookings against their own listing.
create policy "Business owners can log a manual booking"
  on bookings for insert
  with check (
    source = 'manual'
    and business_id in (select id from businesses where owner_id = auth.uid())
  );

-- Lets a customer see their own booking history across every business.
create policy "Customers can view their own bookings"
  on bookings for select
  using (auth.uid() = customer_id);
