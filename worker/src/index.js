// Cloudflare Worker: nalaganje in zasebno branje datotek iz R2.
// Avtentikacija poteka preko Supabase seje (JWT), baza in prijava ostaneta na Supabase.
//
//   PUT /upload/<bucket>/<pot>   (samo admin)    -> shrani v R2, vrne { path }
//   GET /demos/<pot>?token=<jwt> (prijavljen član) -> predvaja zasebno datoteko
//
// Javni 'media' bucket se bere neposredno iz R2 javnega URL-ja (brez Workerja).

const ALLOWED_BUCKETS = ['media', 'demos'];

function cors(env, extra = {}) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Range',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    ...extra,
  };
}

function json(env, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: cors(env, { 'Content-Type': 'application/json' }),
  });
}

async function getUser(env, token) {
  if (!token) return null;
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY },
  });
  if (!res.ok) return null;
  return res.json();
}

async function isAdmin(env, token, userId) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=role`,
    { headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY } }
  );
  if (!res.ok) return false;
  const rows = await res.json();
  return rows[0]?.role === 'admin';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(env) });
    }

    // ---- Nalaganje (admin) ----
    if (request.method === 'PUT' && url.pathname.startsWith('/upload/')) {
      const key = decodeURIComponent(url.pathname.slice('/upload/'.length));
      const bucket = key.split('/')[0];
      if (!ALLOWED_BUCKETS.includes(bucket) || key.split('/').includes('..')) {
        return json(env, 400, { error: 'Neveljavna pot' });
      }

      const token = (request.headers.get('Authorization') || '').replace(/^Bearer /, '');
      const user = await getUser(env, token);
      if (!user || !(await isAdmin(env, token, user.id))) {
        return json(env, 403, { error: 'Samo za admina' });
      }

      await env.BUCKET.put(key, request.body, {
        httpMetadata: { contentType: request.headers.get('Content-Type') || 'application/octet-stream' },
      });
      return json(env, 200, { path: key.slice(bucket.length + 1), key });
    }

    // ---- Zasebno branje demo posnetkov (prijavljen član) ----
    if (request.method === 'GET' && url.pathname.startsWith('/demos/')) {
      const key = decodeURIComponent(url.pathname.slice(1));
      if (key.split('/').includes('..')) return json(env, 400, { error: 'Neveljavna pot' });

      const token = url.searchParams.get('token');
      const user = await getUser(env, token);
      if (!user) return json(env, 403, { error: 'Ni dostopa' });

      const object = await env.BUCKET.get(key, { range: request.headers, onlyIf: request.headers });
      if (!object) return json(env, 404, { error: 'Ni najdeno' });

      const headers = cors(env, {
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
      });
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);

      if (object.range) {
        const { offset = 0, length = object.size } = object.range;
        headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
        return new Response(object.body, { status: 206, headers });
      }
      return new Response(object.body, { headers });
    }

    return json(env, 404, { error: 'Ni najdeno' });
  },
};
