-- v28: Reviews & ratings. Customers who completed a real booking can leave a
-- 1-5 star rating + text review; businesses can reply (once); admins can
-- hide abusive ones. No review/rating concept existed anywhere before this.
--
-- The schema here went through an adversarial design review before being
-- applied (focused on protect_admin_controlled_fields() below and the
-- "same row, different-actor columns" problem this table has: customer
-- owns rating/body, owner owns owner_reply, admin owns status), AND a
-- second adversarial pass after live testing on the initially-applied
-- version turned up three real holes an authenticated session could reach:
-- an INSERT-time business-id check that was a no-op self-tautology (see the
-- long comment on the INSERT policy below), owner_reply/status being
-- forgeable at INSERT time even though UPDATE was correctly locked down,
-- and the reviewer's real auth id leaking through a public row policy with
-- no column projection. All three are fixed in what's below, not left as
-- follow-up work — see the comments inline for what each piece defends
-- against, not just what it does.

create table reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) not null,
  -- One review per booking — the natural key for "did this really happen."
  booking_id uuid references bookings(id) not null unique,
  -- on delete set null (not cascade, not left not-null): a customer deleting
  -- their Supabase account must not cascade-delete public review content
  -- tied to a business that has nothing to do with their account lifecycle,
  -- and must not hard-fail the account deletion with an FK violation either.
  -- The review survives, attributed to its author_name snapshot below.
  customer_id uuid references customers(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  -- DB-level cap on a public, permanent, abuse-prone text field — never rely
  -- on the UI alone to bound this.
  body text check (char_length(body) <= 2000),
  -- Server-derived (see set_review_author_name_trigger below) — never
  -- accept this from the client. RLS only constrains which ROWS you can
  -- touch, not what you put in a free-text column on a row you're otherwise
  -- allowed to write; without this a crafted insert could set author_name to
  -- anyone's real name, a slur, or anything else.
  author_name text not null,
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  owner_reply text,
  owner_replied_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table reviews enable row level security;

create index idx_reviews_business_id on reviews(business_id);
create index idx_reviews_customer_id on reviews(customer_id);

-- SECURITY: the base table has NO public-read policy. RLS restricts which
-- ROWS a role can see, never which COLUMNS — a row policy here would still
-- hand back every column, including customer_id (which IS the reviewer's
-- real auth.users id, not just an opaque internal key — see
-- customer_id = (select auth.uid()) in the insert policy below), to anyone
-- with the anon key via a direct REST call, regardless of what the app's
-- own queries ask for. That would also defeat the whole point of
-- author_name being server-truncated/anonymized. Same lesson this codebase
-- already learned once for businesses_public (see schema.sql) — public
-- reads go through reviews_public (below) instead, a column-projected view.
--
-- A customer can still see their OWN reviews directly (full columns,
-- including their own customer_id — harmless, it's their own) regardless of
-- visible/hidden status, which the account/profile "my reviews" UI needs.
create policy "Customers can view their own reviews"
  on reviews for select
  using (customer_id = (select auth.uid()));

-- NOTE: this EXISTS subquery is itself subject to bookings' own RLS SELECT
-- policy for the acting (customer) role — it happens to line up today,
-- since bookings' own SELECT policy also keys off
-- bookings.customer_id = (select auth.uid()), but that's a dependency, not
-- a coincidence to forget. A future change narrowing customer visibility on
-- bookings would silently break review submission (EXISTS -> false, not an
-- error) rather than raise anything obvious.
--
-- Two things worth over-explaining here, both found only through live
-- testing (static review and a first "fix" both missed them):
--
-- 1. A table-qualified self-reference to the row being inserted
--    ("reviews.booking_id") INSIDE a nested EXISTS subquery does not
--    correctly correlate — empirically, it blocks every insert, including
--    legitimate ones, not just illegitimate ones. Bare (unqualified)
--    references are required instead, matching the pattern already proven
--    working in bookings' own INSERT policy (migration-v27.sql).
--
-- 2. A bare reference inside that same nested subquery is ONLY safe when no
--    table inside the subquery's own FROM clause has a column of that same
--    name. `booking_id` is safe this way (bookings has no "booking_id"
--    column, so it correctly widens out to the row being inserted) —
--    but `business_id` is NOT (bookings DOES have its own "business_id"
--    column), so a bare reference there silently resolves to
--    bookings.business_id itself — a self-referential tautology, always
--    true, that lets a customer attach a review to ANY business using a
--    completed booking from a DIFFERENT one entirely. That's why the
--    business_id check below is pulled OUT of the subquery and compared at
--    the top level instead, where there is no competing column to shadow
--    it.
create policy "Customers can review their own completed bookings"
  on reviews for insert
  with check (
    customer_id = (select auth.uid())
    and owner_reply is null
    and owner_replied_at is null
    and status = 'visible'
    and exists (
      select 1 from bookings
      where bookings.id = booking_id
        and bookings.customer_id = (select auth.uid())
        and bookings.status = 'completed'
    )
    and business_id = (select b.business_id from bookings b where b.id = booking_id)
  );

create policy "Customers can edit their own reviews"
  on reviews for update
  using (customer_id = (select auth.uid()))
  with check (customer_id = (select auth.uid()));

create policy "Customers can delete their own reviews"
  on reviews for delete
  using (customer_id = (select auth.uid()));

-- Public read surface — same shape and same reasoning as businesses_public
-- (schema.sql): a column-projected view, not a public row policy on the
-- base table, so customer_id (the reviewer's real auth id) and booking_id
-- never leave the server for anyone but the reviewing customer themselves.
-- Used by the public listing page, the owner's dashboard Reviews tab, and
-- admin moderation — none of those need customer_id, only author_name.
create view reviews_public as
  select id, business_id, rating, body, author_name, status, owner_reply, owner_replied_at, created_at, updated_at
  from reviews
  where status = 'visible' and business_id in (select id from businesses where status = 'active');

grant select on reviews_public to anon, authenticated;

-- Column-pinning trigger — models lock_booking_customer_id (the established
-- idiom here for "same row, different-actor columns"). The UPDATE policy
-- above is row-scoped, not column-scoped (Postgres RLS has no per-column-
-- per-actor concept), so without this a customer's own-row UPDATE could
-- also rewrite owner_reply/status, or re-point booking_id/business_id at a
-- DIFFERENT booking they never had — effectively relocating their review.
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
    -- Once the owner has publicly replied, freeze what they replied to as
    -- well — otherwise a customer can rewrite rating/body afterward and
    -- leave the reply looking stale or nonsensical.
    if old.owner_replied_at is not null then
      new.rating := old.rating;
      new.body := old.body;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

create trigger enforce_review_column_scope
  before update on reviews
  for each row execute function pin_review_identity_and_moderation_columns();

revoke execute on function pin_review_identity_and_moderation_columns() from public;
revoke execute on function pin_review_identity_and_moderation_columns() from anon, authenticated;

-- Blocks deletion once an owner has replied — prevents a "leave a bad
-- review, get the owner to respond/offer a concession, delete the review"
-- cycle, which would also erase the owner's reply with zero audit trail.
create or replace function block_review_delete_after_reply()
returns trigger as $$
begin
  if auth.role() != 'service_role' and old.owner_replied_at is not null then
    raise exception 'Cannot delete a review after the business has replied.';
  end if;
  return old;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

create trigger enforce_no_review_delete_after_reply
  before delete on reviews
  for each row execute function block_review_delete_after_reply();

revoke execute on function block_review_delete_after_reply() from public;
revoke execute on function block_review_delete_after_reply() from anon, authenticated;

-- Server-derived author_name: "Ahmed Al Khalifa" -> "Ahmed A." Truncated at
-- WRITE time (not display time), so the full name is never even stored on
-- this public row, and always overwrites whatever (if anything) the client
-- sent — see the author_name column comment above for why that matters.
create or replace function set_review_author_name()
returns trigger as $$
declare
  full_name text;
  first_name text;
  rest text;
begin
  select name into full_name from customers where id = new.customer_id;
  first_name := split_part(coalesce(full_name, 'Customer'), ' ', 1);
  rest := trim(substring(coalesce(full_name, '') from length(first_name) + 1));
  new.author_name := case when rest = '' then first_name else first_name || ' ' || left(rest, 1) || '.' end;
  return new;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

create trigger set_review_author_name_trigger
  before insert on reviews
  for each row execute function set_review_author_name();

revoke execute on function set_review_author_name() from public;
revoke execute on function set_review_author_name() from anon, authenticated;

-- --- Aggregate rating on businesses -----------------------------------
alter table businesses add column rating_avg numeric(2,1);
alter table businesses add column review_count integer not null default 0;

create or replace view businesses_public as
  select
    id, status, name, logo_url, subcategories, areas, description,
    phone, whatsapp, hours, services, photos, is_mobile,
    verified, verified_until, tier, rating_avg, review_count
  from businesses
  where status = 'active';

-- protect_admin_controlled_fields() (schema.sql) must pin rating_avg/
-- review_count the same way it already pins status/verified/verified_until/
-- tier/view_count — otherwise "Owners can update their own listing" (no
-- column restriction) lets an owner PATCH their own rating directly via a
-- raw REST call with their own JWT. This reproduces the EXISTING function
-- body in full (Postgres can't partially patch a function) with exactly two
-- lines added to the unconditional reset block, right where view_count is.
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
    new.rating_avg := old.rating_avg;
    new.review_count := old.review_count;

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

      if changed_public != '{}'::jsonb then
        new.pending_changes := coalesce(new.pending_changes, '{}'::jsonb) || changed_public;
      end if;

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

-- The recompute trigger must bypass that same protection, exactly like
-- increment_view_count() already does (schema.sql) — this is the step
-- that's easy to forget and fails SILENTLY (rating_avg/review_count just
-- never update, no error at all) if skipped, since protect_admin_controlled_
-- fields() would otherwise reset them right back to OLD on every write.
create or replace function recompute_business_rating()
returns trigger as $$
declare
  target_business_id uuid := coalesce(new.business_id, old.business_id);
begin
  perform set_config('app.bypass_admin_protection', 'true', true);
  update businesses set
    rating_avg = (select round(avg(rating)::numeric, 1) from reviews where business_id = target_business_id and status = 'visible'),
    review_count = (select count(*) from reviews where business_id = target_business_id and status = 'visible')
  where id = target_business_id;
  return coalesce(new, old);
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

create trigger recompute_business_rating_trigger
  after insert or update or delete on reviews
  for each row execute function recompute_business_rating();

revoke execute on function recompute_business_rating() from public;
revoke execute on function recompute_business_rating() from anon, authenticated;

-- Known, accepted tradeoffs (not bugs — noted so they aren't "discovered"
-- later and assumed to be oversights):
--   1. A booking's `completed` status is only checked at review-INSERT
--      time, never re-validated later if the booking is subsequently
--      disputed/corrected.
--   2. "One review per BOOKING" (not per customer-per-business) — a
--      customer with 5 completed bookings at one business can leave 5
--      reviews. Intentional for v1 (repeat customers' opinions legitimately
--      compound); revisit with a partial unique index on
--      (business_id, customer_id) where status = 'visible' if unwanted.
