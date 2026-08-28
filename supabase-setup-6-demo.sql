-- ============================================================
-- BAKS web – dodatek: zasebna stran za člane (demo verzije pesmi)
-- Zaženi v Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

-- Tabela z demo posnetki (zasebno - vidno samo prijavljenim)
create table if not exists demos (
  id uuid primary key default gen_random_uuid(),
  song text not null,
  version_label text not null,
  opis text,
  file_path text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table demos enable row level security;

-- Pomembno: branje ni javno kot pri ostalih tabelah - samo prijavljeni uporabniki ga vidijo.
create policy "Authenticated read demos" on demos
  for select using (auth.role() = 'authenticated');
create policy "Authenticated write demos" on demos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Zaseben Storage bucket za demo datoteke (ni javno dostopen preko URL-ja)
insert into storage.buckets (id, name, public)
values ('demos', 'demos', false)
on conflict (id) do nothing;

create policy "Authenticated read demos bucket" on storage.objects
  for select using (bucket_id = 'demos' and auth.role() = 'authenticated');
create policy "Authenticated upload demos bucket" on storage.objects
  for insert with check (bucket_id = 'demos' and auth.role() = 'authenticated');
create policy "Authenticated update demos bucket" on storage.objects
  for update using (bucket_id = 'demos' and auth.role() = 'authenticated');
create policy "Authenticated delete demos bucket" on storage.objects
  for delete using (bucket_id = 'demos' and auth.role() = 'authenticated');

-- ============================================================
-- Računi za člane banda (ROČNO, v Dashboardu, enako kot admin):
--    Authentication -> Users -> Add user -> email/geslo za vsakega člana
--    -> "Auto Confirm User" naj bo obkljukano.
--    Vsak tak račun se lahko prijavi na clani.html in posluša demo posnetke.
-- ============================================================
