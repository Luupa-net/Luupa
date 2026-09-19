-- Luupa migration v18 — run this in your Supabase SQL editor.
-- SECURITY HARDENING (found during review of the v17 customer-accounts change):
-- the "Owners can update their own bookings" policy (added long before v17)
-- only ever constrained business_id, never customer_id. Once v17 added the
-- customer_id column, that pre-existing policy had a side effect nobody
-- intended: a business owner could UPDATE their own booking rows and
-- reassign customer_id to an arbitrary UUID, which — combined with v17's new
-- "Customers can view their own bookings" policy (using auth.uid() =
-- customer_id) — would make a fabricated booking appear in a stranger's own
-- booking list if the owner already knew that person's (otherwise
-- unguessable) account id.
--
-- RLS's WITH CHECK can't easily say "this column must equal what it already
-- was" (no OLD reference), so this uses a trigger instead — the same pattern
-- already used for businesses (see protect_admin_controlled_fields() in
-- schema.sql). It silently keeps customer_id pinned to its existing value
-- for any update that isn't run with the service role, without touching any
-- other column a business legitimately needs to update (status, payment
-- info, notes, vehicle details, etc).

create or replace function lock_booking_customer_id()
returns trigger as $$
begin
  if auth.role() != 'service_role' then
    new.customer_id := old.customer_id;
  end if;
  return new;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

revoke execute on function lock_booking_customer_id() from public;
revoke execute on function lock_booking_customer_id() from anon, authenticated;

create trigger enforce_booking_customer_id_immutable
  before update on bookings
  for each row execute function lock_booking_customer_id();
