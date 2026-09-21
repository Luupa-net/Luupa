-- v19: persist the invoice amount on bookings.
--
-- The booking detail panel has always collected an invoice amount, but it
-- was only ever used to render the WhatsApp/email invoice text — never
-- persisted. That means a business could not see how much a booking earned
-- after the fact, and there was no way to build revenue reporting. This adds
-- a plain numeric column, updatable only by the business that owns the
-- booking (already covered by the existing "Owners can update their own
-- bookings" RLS policy in schema.sql — no policy change needed).
alter table bookings add column if not exists amount numeric(10,2);
comment on column bookings.amount is 'Invoiced amount in BHD, set by the business when marking a booking paid.';
