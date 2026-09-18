-- Luupa migration v15 — run this in your Supabase SQL editor.
-- SECURITY FIX: RLS row policies restrict which ROWS a role can see, never
-- which COLUMNS. The old "Public can view active businesses" policy
-- (`using (status = 'active')`, no `to` clause — so it applied to both
-- anon AND authenticated) handed back every column of any active business,
-- including admin-only ones: cr_number, applicant_note, owner_id,
-- social_link, payment_qr_url, pending_changes. Anyone holding the public
-- anon key (necessarily shipped to every browser) could read all of that
-- directly via the Supabase REST API — completely independent of what the
-- app's own queries ask for, so narrowing the app's select() calls (v14 and
-- earlier) never closed this at the database layer.
--
-- This replaces the row policy with a view that projects down to a safe
-- column list before anyone outside the owner gets to read it. The view
-- intentionally does NOT use `security_invoker` — it runs with the
-- privileges of its owner so it can read the base table itself, then hands
-- back only the listed columns to whichever role queries the view.
--
-- After this runs, direct queries against `businesses` for rows you don't
-- own return zero rows for anon/authenticated (as intended) — public reads
-- must go through `businesses_public` instead. "Owners can view their own
-- listing" (auth.uid() = owner_id) is untouched, so businesses still see
-- every column of their own row regardless of status.

drop policy if exists "Public can view active businesses" on businesses;

create or replace view businesses_public as
  select
    id, status, name, logo_url, subcategories, areas, description,
    phone, whatsapp, hours, services, photos, is_mobile,
    verified, verified_until, tier
  from businesses
  where status = 'active';

grant select on businesses_public to anon, authenticated;

-- Hardening: make the UPDATE policies' WITH CHECK explicit instead of
-- relying on Postgres's implicit rule that USING is reused for the check
-- when no WITH CHECK is given. Behavior is identical either way — this
-- just makes the "owner can only touch their own row, including after the
-- update" invariant visible without having to know that implicit rule.
alter policy "Owners can update their own listing"
  on businesses
  with check (auth.uid() = owner_id);

alter policy "Owners can update their own inquiries"
  on inquiries
  with check (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

alter policy "Owners can update their own bookings"
  on bookings
  with check (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

-- Supabase's PostgREST caches the schema — if the new view doesn't show up
-- immediately at /rest/v1/businesses_public, reload it:
-- notify pgrst, 'reload schema';
