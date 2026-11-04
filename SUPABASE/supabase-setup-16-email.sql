-- ============================================================
-- BAKS web – dodatek: e-poštni naslov za kontakt (v nogi strani)
-- Zaženi v Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

alter table settings add column if not exists contact_email text;

update settings set contact_email = 'baks.band@atomicmail.io' where id = 1 and contact_email is null;
