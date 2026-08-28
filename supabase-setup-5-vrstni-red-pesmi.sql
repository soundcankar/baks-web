-- ============================================================
-- BAKS web – dodatek: vrstni red posameznih pesmi znotraj albuma
-- Zaženi v Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

alter table posnetki add column if not exists sort_order int default 0;
