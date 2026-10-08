-- Zaženi v Supabase SQL Editorju PO uspešni migraciji datotek (migrate.mjs).
-- Zamenjaj PRIPONA_R2 z R2 javnim URL-jem, npr. https://pub-abc123.r2.dev

do $$
declare
  old_prefix text := 'https://heltbjqwskckqifznlml.supabase.co/storage/v1/object/public/media/';
  new_prefix text := 'https://pub-639091bcb06e41f3980d287948208687.r2.dev/media/';
begin
  update posnetki         set file_url      = replace(file_url,      old_prefix, new_prefix);
  update novice           set image_url     = replace(image_url,     old_prefix, new_prefix);
  update gallery          set image_url     = replace(image_url,     old_prefix, new_prefix);
  update albums           set image_url     = replace(image_url,     old_prefix, new_prefix);
  update page_backgrounds set image_url     = replace(image_url,     old_prefix, new_prefix);
  update sponsors         set logo_url      = replace(logo_url,      old_prefix, new_prefix);
  update settings         set band_photo_url = replace(band_photo_url, old_prefix, new_prefix);
end $$;
