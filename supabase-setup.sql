-- ============================================================
-- BAKS web – enkratna nastavitev Supabase baze za admin panel
-- Zaženi v Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

-- 1) Obstoječi tabeli (novice, posnetki): omogoči RLS,
--    javno branje ostane odprto, pisanje samo za prijavljene.
alter table novice enable row level security;
alter table posnetki enable row level security;

create policy "Public read novice" on novice
  for select using (true);
create policy "Authenticated write novice" on novice
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Public read posnetki" on posnetki
  for select using (true);
create policy "Authenticated write posnetki" on posnetki
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 2) Nova tabela: settings (slogan, opis benda, člani) - ena vrstica
create table if not exists settings (
  id int primary key default 1,
  hero_tagline text,
  about_text text,
  members jsonb default '[]'::jsonb,
  constraint settings_single_row check (id = 1)
);

insert into settings (id, hero_tagline, about_text, members)
values (
  1,
  'Coverjev bend, ki dvigne vzdušje na vsakem koncertu.',
  'Tukaj napišeš opis banda – kdaj je nastal, kakšen stil glasbe igrate, kaj vas dela posebne, koncerti, zgodovina, zanimivosti…',
  '["Klemen Janežič – vokal/bas kitara", "Boštjan Marn – bobni", "Anže Mihelčič – kitara", "Andrej Petrlin – kitara"]'
)
on conflict (id) do nothing;

alter table settings enable row level security;

create policy "Public read settings" on settings
  for select using (true);
create policy "Authenticated write settings" on settings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 3) Nova tabela: links (družbena omrežja / povezave)
create table if not exists links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

insert into links (label, url, sort_order)
values ('Facebook', 'https://www.facebook.com/p/BAKS-61576237621526/', 1);

alter table links enable row level security;

create policy "Public read links" on links
  for select using (true);
create policy "Authenticated write links" on links
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 4) Storage bucket za slike/posnetke, ki jih naložiš preko admin panela
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "Public read media" on storage.objects
  for select using (bucket_id = 'media');
create policy "Authenticated upload media" on storage.objects
  for insert with check (bucket_id = 'media' and auth.role() = 'authenticated');
create policy "Authenticated update media" on storage.objects
  for update using (bucket_id = 'media' and auth.role() = 'authenticated');
create policy "Authenticated delete media" on storage.objects
  for delete using (bucket_id = 'media' and auth.role() = 'authenticated');

-- ============================================================
-- 5) Admin uporabnik (ROČNO, v Dashboardu, ne preko SQL):
--    Authentication -> Users -> Add user -> vnesi email/geslo
--    -> "Auto Confirm User" naj bo obkljukano.
--    S tem računom se boš prijavil/a v admin.html.
-- ============================================================
