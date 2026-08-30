-- ============================================================
-- BAKS web – dodatek: anonimna statistika obiskov (brez piškotkov,
-- brez IP naslovov, brez identitete obiskovalca - GDPR OK brez
-- soglasja, ker ne beležimo osebnih podatkov).
-- Zaženi v Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

create table if not exists page_views (
  id bigint generated always as identity primary key,
  page text not null,
  referrer text,
  device text,
  browser text,
  created_at timestamptz default now()
);

alter table page_views enable row level security;

-- Kdorkoli (tudi anonimen obiskovalec) lahko zabeleži svoj ogled strani,
-- ampak NIHČE (razen admina) ne more prebrati zbranih podatkov nazaj.
create policy "Anyone can log a page view" on page_views
  for insert with check (true);

create policy "Admin read page views" on page_views
  for select using (is_admin());

-- Brez UPDATE/DELETE politike - zapisov ni mogoče spreminjati ali brisati
-- niti prek admin računa (samo bran/vstavljen, kar je za statistiko dovolj).
