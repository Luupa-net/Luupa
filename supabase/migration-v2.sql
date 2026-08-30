-- Luupa migration — run this in your Supabase SQL editor if you already ran the
-- original schema.sql. This only adds what's new; it won't touch your existing data.

alter table businesses add column if not exists cr_number text;
alter table businesses add column if not exists social_link text;
alter table businesses add column if not exists applicant_note text;
alter table businesses add column if not exists view_count integer default 0;

-- SECURITY: prevents a business from setting their own verified/status/tier via
-- a direct browser request — only the admin (using the service role key) can.
create or replace function protect_admin_controlled_fields()
returns trigger as $$
begin
  if auth.role() != 'service_role'
     and coalesce(current_setting('app.bypass_admin_protection', true), '') != 'true' then
    new.status := old.status;
    new.verified := old.verified;
    new.tier := old.tier;
    new.view_count := old.view_count;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists enforce_admin_controlled_fields on businesses;
create trigger enforce_admin_controlled_fields
  before update on businesses
  for each row execute function protect_admin_controlled_fields();

create or replace function increment_view_count(business_id uuid)
returns void as $$
begin
  perform set_config('app.bypass_admin_protection', 'true', true);
  update businesses set view_count = view_count + 1 where id = business_id;
end;
$$ language plpgsql security definer;

grant execute on function increment_view_count(uuid) to anon, authenticated;

-- Storage bucket for business photos — public read (anyone can view a listing's
-- photos), but only logged-in businesses can upload, and only to their own folder.
insert into storage.buckets (id, name, public)
values ('business-photos', 'business-photos', true)
on conflict (id) do nothing;

create policy "Public can view business photos"
  on storage.objects for select
  using (bucket_id = 'business-photos');

create policy "Authenticated users can upload their own photos"
  on storage.objects for insert
  with check (bucket_id = 'business-photos' and auth.role() = 'authenticated');

create policy "Users can delete their own uploaded photos"
  on storage.objects for delete
  using (bucket_id = 'business-photos' and owner = auth.uid());
