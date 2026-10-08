-- ============================================================
-- BAKS web – dodatek: vrstni red galerije (dogodki in slike znotraj dogodka)
-- Zaženi v Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

alter table gallery add column if not exists sort_order int not null default 0;   -- vrstni red slike znotraj dogodka
alter table gallery add column if not exists event_order int not null default 0;  -- vrstni red dogodka (enak za vse slike dogodka)

-- Začetni vrstni red enak dosedanjemu prikazu: najnovejše naprej
with ranked as (
  select id,
         row_number() over (partition by event_name order by created_at desc) - 1 as s
  from gallery
)
update gallery g set sort_order = ranked.s from ranked where g.id = ranked.id;

with events as (
  select event_name,
         row_number() over (order by max(created_at) desc) - 1 as e
  from gallery
  group by event_name
)
update gallery g set event_order = events.e from events where g.event_name = events.event_name;
