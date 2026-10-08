// Prenese vse datoteke iz Supabase Storage (media + demos) in jih naloži na R2 preko Workerja.
// Zagon (Node 18+):
//   $env:ADMIN_EMAIL="..."; $env:ADMIN_PASSWORD="..."; $env:WORKER_URL="https://baks-files.xxx.workers.dev"
//   node worker/migrate.mjs
// Poti ostanejo enake, zato je v bazi treba zamenjati samo prefiks URL-jev (glej migrate-urls.sql).

const SUPABASE_URL = 'https://heltbjqwskckqifznlml.supabase.co';
const ANON_KEY = 'sb_publishable_vEHhXtkpJq8ndMFvXGK0zg_ok4i8Kqn';
const { ADMIN_EMAIL, ADMIN_PASSWORD, WORKER_URL } = process.env;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !WORKER_URL) {
  console.error('Nastavi ADMIN_EMAIL, ADMIN_PASSWORD in WORKER_URL.');
  process.exit(1);
}

const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
});
if (!login.ok) throw new Error('Prijava ni uspela: ' + (await login.text()));
const token = (await login.json()).access_token;
const auth = { apikey: ANON_KEY, Authorization: `Bearer ${token}` };

async function listAll(bucket, prefix = '') {
  const files = [];
  let offset = 0;
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 100, offset }),
    });
    if (!res.ok) throw new Error(`Seznam ${bucket}/${prefix}: ` + (await res.text()));
    const items = await res.json();
    for (const it of items) {
      const path = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.id === null) files.push(...(await listAll(bucket, path)));
      else files.push({ path, size: it.metadata?.size ?? 0, type: it.metadata?.mimetype });
    }
    if (items.length < 100) break;
    offset += 100;
  }
  return files;
}

for (const bucket of ['media', 'demos']) {
  // Neobvezno: $env:ONLY="\.\." obdela samo datoteke, katerih pot ustreza regularnemu izrazu
  const files = (await listAll(bucket)).filter(f => !process.env.ONLY || new RegExp(process.env.ONLY).test(f.path));
  console.log(`\n== ${bucket}: ${files.length} datotek, ${(files.reduce((s, f) => s + f.size, 0) / 1e6).toFixed(1)} MB`);

  for (const f of files) {
    const down = await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/${bucket}/${f.path}`, { headers: auth });
    if (!down.ok) { console.error('  NAPAKA prenos', f.path, down.status); continue; }
    const body = Buffer.from(await down.arrayBuffer());

    const up = await fetch(`${WORKER_URL}/upload/${bucket}/${encodeURI(f.path)}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': f.type || 'application/octet-stream' },
      body,
    });
    console.log(up.ok ? '  OK   ' : '  NAPAKA', f.path, up.ok ? '' : await up.text());
  }
}
