-- Luupa migration v3 — run this in your Supabase SQL editor.
-- Adds: business logo, multi-category (subcategories) and multi-location (areas)
-- support, migrating any existing single values into the new array columns.

alter table businesses add column if not exists logo_url text;
alter table businesses add column if not exists subcategories text[] default '{}';
alter table businesses add column if not exists areas text[] default '{}';

-- Carry forward any existing single subcategory/area into the new arrays,
-- so nothing already entered gets lost
update businesses
  set subcategories = array[subcategory]
  where subcategory is not null and (subcategories is null or subcategories = '{}');

update businesses
  set areas = array[area]
  where area is not null and (areas is null or areas = '{}');
