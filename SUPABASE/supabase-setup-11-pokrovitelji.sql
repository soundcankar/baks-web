-- ============================================================
-- BAKS web – dodatek: razdelek "Pokrovitelji" na domači strani
-- Zaženi v Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

create table if not exists sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text not null,
  website_url text,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table sponsors enable row level security;

-- Branje je javno (logotipi se prikazujejo na domači strani vsem obiskovalcem).
create policy "Public read sponsors" on sponsors
  for select using (true);

-- Pisanje (dodajanje/urejanje/brisanje) samo za admina.
create policy "Admin write sponsors" on sponsors
  for all using (is_admin()) with check (is_admin());
