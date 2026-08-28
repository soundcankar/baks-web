-- ============================================================
-- BAKS web – dodatek: ločitev vlog (admin vs. član benda)
-- Zaženi v Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- Do zdaj je vsak prijavljen uporabnik (tudi člani banda) lahko
-- urejal vso vsebino, ker so vse politike preverjale samo
-- "je prijavljen", ne pa "je admin". Ta skripta doda pravo ločitev.
-- ============================================================

-- 1) Tabela profilov: vsak uporabnik ima vlogo 'admin' ali 'member'
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member'))
);

alter table profiles enable row level security;

create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);

-- 2) Ob vsaki novi registraciji uporabnika (ko ustvariš uporabnika v
--    Dashboardu) se avtomatsko doda profil z vlogo 'member'.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role) values (new.id, 'member');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 3) Pomožna funkcija za preverjanje admin vloge v politikah
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- 4) Posodobi vse "pisalne" politike, da namesto "je prijavljen"
--    zahtevajo "je admin". Branje (kjer je bilo javno) ostane javno.
drop policy if exists "Authenticated write novice" on novice;
create policy "Admin write novice" on novice
  for all using (is_admin()) with check (is_admin());

drop policy if exists "Authenticated write posnetki" on posnetki;
create policy "Admin write posnetki" on posnetki
  for all using (is_admin()) with check (is_admin());

drop policy if exists "Authenticated write settings" on settings;
create policy "Admin write settings" on settings
  for all using (is_admin()) with check (is_admin());

drop policy if exists "Authenticated write links" on links;
create policy "Admin write links" on links
  for all using (is_admin()) with check (is_admin());

drop policy if exists "Authenticated write page_backgrounds" on page_backgrounds;
create policy "Admin write page_backgrounds" on page_backgrounds
  for all using (is_admin()) with check (is_admin());

drop policy if exists "Authenticated write gallery" on gallery;
create policy "Admin write gallery" on gallery
  for all using (is_admin()) with check (is_admin());

drop policy if exists "Authenticated write albums" on albums;
create policy "Admin write albums" on albums
  for all using (is_admin()) with check (is_admin());

-- Demo tabela: branje ostane "prijavljen" (člani MORAJO videti demo),
-- pisanje pa se omeji na admina.
drop policy if exists "Authenticated write demos" on demos;
create policy "Admin write demos" on demos
  for all using (is_admin()) with check (is_admin());

-- Storage bucket 'media' (slike/posnetki, ki jih dodaja admin)
drop policy if exists "Authenticated upload media" on storage.objects;
create policy "Admin upload media" on storage.objects
  for insert with check (bucket_id = 'media' and is_admin());
drop policy if exists "Authenticated update media" on storage.objects;
create policy "Admin update media" on storage.objects
  for update using (bucket_id = 'media' and is_admin());
drop policy if exists "Authenticated delete media" on storage.objects;
create policy "Admin delete media" on storage.objects
  for delete using (bucket_id = 'media' and is_admin());

-- Storage bucket 'demos' (nalaganje ostane samo za admina, branje ostane za vse prijavljene)
drop policy if exists "Authenticated upload demos bucket" on storage.objects;
create policy "Admin upload demos bucket" on storage.objects
  for insert with check (bucket_id = 'demos' and is_admin());
drop policy if exists "Authenticated update demos bucket" on storage.objects;
create policy "Admin update demos bucket" on storage.objects
  for update using (bucket_id = 'demos' and is_admin());
drop policy if exists "Authenticated delete demos bucket" on storage.objects;
create policy "Admin delete demos bucket" on storage.objects
  for delete using (bucket_id = 'demos' and is_admin());

-- ============================================================
-- 5) POMEMBNO – ročni korak:
--    Tvoj obstoječi admin račun (ustvarjen pred to skripto) nima
--    še profila. Spodaj zamenjaj 'TVOJ-ADMIN-EMAIL' s svojim
--    dejanskim emailom (tistim, s katerim se prijaviš v admin.html)
--    in poženi to vrstico posebej:
--
--    insert into profiles (id, role)
--    select id, 'admin' from auth.users where email = 'TVOJ-ADMIN-EMAIL'
--    on conflict (id) do update set role = 'admin';
--
--    Vsi NOVI računi, ki jih ustvariš za člane po tej skripti,
--    dobijo privzeto vlogo 'member' avtomatsko (ne moreš urejati,
--    samo gledati/poslušati demo). Če bi želel/a še koga narediti
--    admina, ponovi zgornji insert z njegovim emailom in 'admin'.
-- ============================================================
