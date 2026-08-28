-- ============================================================
-- BAKS web – dodatek: urejljiva slika ob "O bandu" opisu
-- Zaženi v Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

alter table settings add column if not exists band_photo_url text;
