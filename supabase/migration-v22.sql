-- v22: add "Benefit" (BenefitPay) as a recognized payment method alongside
-- cash and card — Bahrain's most common digital payment rail, previously
-- only referenced indirectly via the optional BenefitPay QR code, not as a
-- selectable method on an invoice or in the payment ledger.

alter table bookings drop constraint bookings_payment_method_check;
alter table bookings add constraint bookings_payment_method_check check (payment_method in ('cash', 'card', 'benefit'));

alter table booking_payments drop constraint booking_payments_method_check;
alter table booking_payments add constraint booking_payments_method_check check (method in ('cash', 'card', 'benefit'));
