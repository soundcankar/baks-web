-- ============================================================
-- BAKS web – dodatek: albumi v članskem delu (demo posnetki)
-- Pesem (z vsemi verzijami) lahko pripišeš albumu. Brez albuma = ostane na koncu.
-- Zaženi v Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

alter table demos add column if not exists album text;
