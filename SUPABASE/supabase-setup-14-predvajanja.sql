-- ============================================================
-- BAKS web – dodatek: štetje predvajanj pesmi (katere pesmi se največ poslušajo)
-- Anonimno, brez piškotkov in IP naslovov – beleži se samo pesem in čas.
-- Zaženi v Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

create table if not exists track_plays (
  id bigint generated always as identity primary key,
  naslov text not null,
  album text,
  source text,                      -- 'seznam' (predvajalnik ob pesmi) ali 'radio'
  created_at timestamptz default now()
);

alter table track_plays enable row level security;

-- Kdorkoli (tudi anonimen obiskovalec) lahko zabeleži predvajanje,
-- prebere pa jih lahko samo admin.
create policy "Anyone can log a track play" on track_plays
  for insert with check (true);

create policy "Admin read track plays" on track_plays
  for select using (is_admin());

-- Seštevanje poteka v bazi (admin prejme samo top 10 vrstic, ne vseh predvajanj;
-- tako ni omejitve 1000 vrstic na poizvedbo in je prenosa podatkov minimalno).
create or replace function track_play_stats()
returns table (naslov text, album text, plays bigint)
language sql
security definer
set search_path = public
as $$
  select p.naslov, p.album, count(*) as plays
  from track_plays p
  where is_admin()
  group by p.naslov, p.album
  order by plays desc
  limit 10;
$$;

revoke all on function track_play_stats() from public, anon;
grant execute on function track_play_stats() to authenticated;
