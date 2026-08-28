-- ============================================================
-- BAKS web – dodatek: vrstni red albumov (stran Posnetki)
-- Zaženi v Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

create table if not exists albums (
  name text primary key,
  sort_order int default 0
);

alter table albums enable row level security;

create policy "Public read albums" on albums
  for select using (true);
create policy "Authenticated write albums" on albums
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
