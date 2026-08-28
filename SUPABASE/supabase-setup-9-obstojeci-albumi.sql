-- ============================================================
-- BAKS web – dodatek: dopolni tabelo albums z obstoječimi albumi
-- (potrebno, ker so bili dodani pred funkcijo za vrstni red)
-- Zaženi v Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

insert into albums (name, sort_order)
select
  album,
  row_number() over (order by min(created_at)) as sort_order
from posnetki
where type = 'audio' and album is not null and album <> ''
group by album
on conflict (name) do nothing;
