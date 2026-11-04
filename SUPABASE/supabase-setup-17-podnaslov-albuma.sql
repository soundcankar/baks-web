-- ============================================================
-- BAKS web – dodatek: podnaslov albuma (npr. "studijski album", "live")
-- Zaženi v Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

alter table albums add column if not exists subtitle text;
