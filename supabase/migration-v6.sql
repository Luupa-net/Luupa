-- Luupa migration v6 — run this in your Supabase SQL editor.
-- Adds a read/unread flag so the dashboard inbox can show what's new.

alter table inquiries add column if not exists read boolean default false;

-- Business owners can mark their own inquiries as read
drop policy if exists "Owners can update their own inquiries" on inquiries;
create policy "Owners can update their own inquiries"
  on inquiries for update
  using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );
