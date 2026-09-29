-- v27: RLS performance cleanup, flagged by the Supabase performance advisor.
--
-- Two related issues, both purely about *how* these policies are evaluated —
-- none of this changes who can see or write what:
--
-- 1. auth_rls_initplan: five policies on staff/bookings/booking_status_history
--    called auth.uid() (or a function wrapping it) directly in the policy
--    body, which Postgres re-evaluates once per row scanned. Wrapping it as
--    `(select auth.uid())` lets Postgres evaluate it once per statement and
--    treat it as a stable input, which is the documented fix — see
--    https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- 2. multiple_permissive_policies: staff/bookings/booking_status_history each
--    have 2-3 independently-permissive policies for the same role+action
--    (an "Owners can..." one and a "Staff can..." one, evaluated separately
--    and OR'd together by Postgres). Merging each pair/trio into one policy
--    with an explicit `or` produces the identical effective access with one
--    policy evaluation instead of two or three.

-- --- staff: SELECT (3 policies -> 1) ---------------------------------------
-- Preserves all three original conditions exactly, OR'd together:
--   - owner of the business
--   - the staff member's own row (direct auth_user_id match — deliberately
--     kept as its own OR branch, not folded into the roster branch below,
--     because staff_business_id_for() filters on `active`; a staff member
--     who's been deactivated mid-session must still be able to see their own
--     row even though they no longer show up in the "business roster" branch)
--   - the rest of an active staff member's own business roster, via the
--     SECURITY DEFINER helper from migration-v24.sql (unchanged — that
--     function exists specifically to avoid the recursion migration-v24
--     documents; this migration only wraps the auth.uid() passed into it)
drop policy if exists "Owners can view their own staff" on staff;
drop policy if exists "Staff can view their business roster" on staff;
drop policy if exists "Staff can view their own row" on staff;

create policy "Owners and staff can view their business roster"
  on staff for select
  using (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
    or auth_user_id = (select auth.uid())
    or business_id = staff_business_id_for((select auth.uid()))
  );

-- --- bookings: INSERT (2 policies -> 1) ------------------------------------
drop policy if exists "Owners and customers can insert their own bookings" on bookings;
drop policy if exists "Staff can insert bookings for their business" on bookings;

create policy "Owners, customers, and staff can insert bookings"
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
    or business_id in (select business_id from staff where auth_user_id = (select auth.uid()) and active)
  );

-- --- bookings: UPDATE (2 policies -> 1) ------------------------------------
drop policy if exists "Owners can update their own bookings" on bookings;
drop policy if exists "Staff can update bookings for their business" on bookings;

create policy "Owners and staff can update bookings for their business"
  on bookings for update
  using (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
    or business_id in (select business_id from staff where auth_user_id = (select auth.uid()) and active)
  )
  with check (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
    or business_id in (select business_id from staff where auth_user_id = (select auth.uid()) and active)
  );

-- --- booking_status_history: SELECT (2 policies -> 1) ----------------------
drop policy if exists "Owners can view their own booking status history" on booking_status_history;
drop policy if exists "Staff can view their business's booking status history" on booking_status_history;

create policy "Owners and staff can view their business's booking status history"
  on booking_status_history for select
  using (
    business_id in (select id from businesses where owner_id = (select auth.uid()))
    or business_id in (select business_id from staff where auth_user_id = (select auth.uid()) and active)
  );
