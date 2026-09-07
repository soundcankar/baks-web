-- ============================================================
-- BAKS web – dodatek: slika (naslovnica) posameznega albuma
-- Zaženi v Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

alter table albums add column if not exists image_url text;

-- Politike za albums (branje javno, pisanje samo admin) že obstajajo
-- iz prejšnjih skript, tukaj ni potrebno ničesar dodajati.
