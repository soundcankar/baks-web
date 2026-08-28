-- ============================================================
-- BAKS web – dodatek: ozadja podstrani (Novice, Posnetki, Povezave)
-- Zaženi v Supabase Dashboard -> SQL Editor -> New query -> Run
-- (to je DODATEK k supabase-setup.sql, ki si ga že pognal/pognala)
-- ============================================================

create table if not exists page_backgrounds (
  page text primary key,
  image_url text
);

insert into page_backgrounds (page, image_url) values
  ('index', null),
  ('novice', null),
  ('posnetki', null),
  ('povezave', null)
on conflict (page) do nothing;

alter table page_backgrounds enable row level security;

create policy "Public read page_backgrounds" on page_backgrounds
  for select using (true);
create policy "Authenticated write page_backgrounds" on page_backgrounds
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
