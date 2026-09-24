-- v24: fix infinite recursion in the "Staff can view their business roster"
-- policy added by migration-v23.sql.
--
-- That policy's USING clause subqueries `staff` from within a policy ON
-- `staff` itself. Postgres re-applies every RLS policy on a table to a
-- subquery against that same table, so evaluating this policy required
-- evaluating this policy — Postgres detects the cycle and raises
-- "infinite recursion detected in policy for relation staff" (42P17) for
-- ANY query touching `staff`, not just the recursive one: the owner's plain
-- staff list, adding a staff member, staff creating/updating bookings
-- (which subqueries `staff` from a `bookings` policy), and the booking
-- status history read all broke as a result.
--
-- Fix: move the self-lookup into a SECURITY DEFINER function. A function
-- owned by the table owner bypasses RLS on the table it queries (same
-- reasoning already used for businesses_public and bookings_operational in
-- migration-v15.sql / migration-v23.sql), so the lookup no longer
-- re-triggers `staff`'s own policies and the cycle is broken.

create or replace function staff_business_id_for(uid uuid)
returns uuid
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select business_id from staff where auth_user_id = uid and active limit 1;
$$;

revoke execute on function staff_business_id_for(uuid) from public;
grant execute on function staff_business_id_for(uuid) to authenticated;

drop policy if exists "Staff can view their business roster" on staff;
create policy "Staff can view their business roster"
  on staff for select
  using (business_id = staff_business_id_for(auth.uid()));
