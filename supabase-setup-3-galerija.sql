-- ============================================================
-- BAKS web – dodatek: galerija slik dogodkov (stran Media)
-- Zaženi v Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

create table if not exists gallery (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  image_url text not null,
  created_at timestamptz default now()
);

alter table gallery enable row level security;

create policy "Public read gallery" on gallery
  for select using (true);
create policy "Authenticated write gallery" on gallery
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
