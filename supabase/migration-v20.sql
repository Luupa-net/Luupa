-- v20: database-layer hardening + performance pass, prompted by Supabase's
-- own advisors and a code-bug sweep. Every RLS policy below is a drop+recreate
-- with IDENTICAL logic to schema.sql/migration-v19 — only wrapping bare
-- auth.uid() calls in (select auth.uid()) so Postgres caches the value once
-- per statement instead of re-evaluating it per row (the exact fix the
-- Supabase linter's "Auth RLS Initialization Plan" warning recommends).
-- Nothing here changes who can see or write which rows.

-- ── Missing indexes on foreign keys (flagged by the performance advisor) ──
create index if not exists idx_bookings_business_id on bookings(business_id);
create index if not exists idx_bookings_customer_id on bookings(customer_id);
create index if not exists idx_inquiries_business_id on inquiries(business_id);

-- ── Enforce "one business per owner" at the DB level ──
-- The insert policy's comment already documented this as the intended
-- invariant, but nothing enforced it — a duplicate/retried signup (e.g.
-- SignupWizard re-submitting for an email Supabase treats as already
-- registered) could silently create a second row for the same owner_id,
-- after which `.single()` lookups in the dashboard/bookings pages would
-- start failing with "no rows" and show a confusing "No listing found".
-- Verified no existing duplicates before adding this. This also covers the
-- "missing index on businesses.owner_id" performance advisory on its own —
-- a unique constraint's index already serves owner_id lookups, so no
-- separate plain index is created for it.
alter table businesses add constraint businesses_owner_id_key unique (owner_id);

-- ── businesses ──
drop policy if exists "Owners can view their own listing" on businesses;
create policy "Owners can view their own listing"
  on businesses for select
  using ((select auth.uid()) = owner_id);

drop policy if exists "Owners can update their own listing" on businesses;
create policy "Owners can update their own listing"
  on businesses for update
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can insert their own business" on businesses;
create policy "Users can insert their own business"
  on businesses for insert
  with check ((select auth.uid()) = owner_id);

-- ── inquiries ──
drop policy if exists "Owners can view their own inquiries" on inquiries;
create policy "Owners can view their own inquiries"
  on inquiries for select
  using (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
  );

drop policy if exists "Owners can update their own inquiries" on inquiries;
create policy "Owners can update their own inquiries"
  on inquiries for update
  using (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
  )
  with check (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
  );

-- ── customers ──
drop policy if exists "Customers can view their own profile" on customers;
create policy "Customers can view their own profile"
  on customers for select
  using ((select auth.uid()) = id);

drop policy if exists "Customers can create their own profile" on customers;
create policy "Customers can create their own profile"
  on customers for insert
  with check ((select auth.uid()) = id);

drop policy if exists "Customers can update their own profile" on customers;
create policy "Customers can update their own profile"
  on customers for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ── bookings ──
-- SELECT: two separate permissive policies ("owner sees their bookings" /
-- "customer sees their own bookings") were both evaluated on every query,
-- even though they're mutually exclusive in practice. Merged into one
-- OR'd policy — same rows visible to the same people, evaluated once.
drop policy if exists "Owners can view their own bookings" on bookings;
drop policy if exists "Customers can view their own bookings" on bookings;
create policy "Owners and customers can view relevant bookings"
  on bookings for select
  using (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
    or (select auth.uid()) = customer_id
  );

-- INSERT: same consolidation — a customer-initiated request and a business's
-- own manual/walk-in entry are mutually exclusive on `source`, so merging
-- them into one OR'd check changes nothing about which inserts are allowed.
drop policy if exists "Customers can submit a booking request" on bookings;
drop policy if exists "Business owners can log a manual booking" on bookings;
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

drop policy if exists "Owners can update their own bookings" on bookings;
create policy "Owners can update their own bookings"
  on bookings for update
  using (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
  )
  with check (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
  );
