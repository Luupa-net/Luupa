-- Luupa migration v13 — run this in your Supabase SQL editor.
-- Lets a business upload their own BenefitPay QR code once, which then rides
-- along with every invoice sent to a customer. Luupa never touches the
-- money — the customer pays the business directly, same as everything else
-- on the platform.

alter table businesses add column if not exists payment_qr_url text;
