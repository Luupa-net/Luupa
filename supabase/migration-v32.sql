-- migration-v32: contact form messages.
--
-- The /contact page saves every message here first, then emails a copy to
-- Luupa's support inbox as a best effort — so a message is never lost when
-- email delivery is down (e.g. before luupa.net is verified with Resend).
-- Read and marked handled from the admin page.
--
-- RLS on with NO policies, and every privilege revoked from anon and
-- authenticated: only the service role (the /api/contact route and the
-- admin API) can touch this table. Safe to re-run.

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  phone text not null check (char_length(phone) between 8 and 20),
  email text check (email is null or char_length(email) <= 200),
  role text not null check (role in ('driver', 'business', 'other')),
  topic text not null check (char_length(topic) between 1 and 60),
  car text check (car is null or char_length(car) <= 100),
  message text not null check (char_length(message) between 1 and 3000),
  -- HMAC of the sender's IP (never the raw IP) — only used to rate-limit.
  ip_hash text,
  emailed boolean not null default false,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

alter table contact_messages enable row level security;
revoke all on contact_messages from anon, authenticated;

create index if not exists contact_messages_created_idx on contact_messages (created_at desc);
create index if not exists contact_messages_ip_idx on contact_messages (ip_hash, created_at desc);
