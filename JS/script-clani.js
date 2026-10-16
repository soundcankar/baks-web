const FILES_WORKER_URL = 'https://baks-files.bals-skupine.workers.dev'; // enako kot v script-admin.js

const supabaseClani = supabase.createClient(
  'https://heltbjqwskckqifznlml.supabase.co',
  'sb_publishable_vEHhXtkpJq8ndMFvXGK0zg_ok4i8Kqn'
);

const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const demoList = document.getElementById('demo-list');

function showLogin() {
  loginView.hidden = false;
  dashboardView.hidden = true;
}

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
  loadDemos();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const { error } = await supabaseClani.auth.signInWithPassword({ email, password });
    if (error) {
      loginError.textContent = 'Napaka: ' + error.message;
      loginError.hidden = false;
    }
  } catch (err) {
    loginError.textContent = 'Napaka pri povezavi: ' + err.message;
    loginError.hidden = false;
  }
});

logoutBtn.addEventListener('click', () => supabaseClani.auth.signOut());

supabaseClani.auth.onAuthStateChange((_event, session) => {
  if (session) showDashboard(); else showLogin();
});

async function loadDemos() {
  const { data, error } = await supabaseClani
    .from('demos')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    demoList.innerHTML = `<p class="form-error">Napaka: ${error.message}</p>`;
    return;
  }

  // album -> pesem -> verzije (Map ohrani vrstni red vstavljanja)
  const albums = new Map();
  (data || []).forEach(d => {
    const albumName = d.album || '';
    if (!albums.has(albumName)) albums.set(albumName, new Map());
    const songs = albums.get(albumName);
    if (!songs.has(d.song)) songs.set(d.song, []);
    songs.get(d.song).push(d);
  });

  if (albums.size === 0) {
    demoList.innerHTML = '<p>Trenutno ni dodanih demo posnetkov.</p>';
    return;
  }

  // Albumi po abecedi, pesmi brez albuma na koncu
  const albumNames = [...albums.keys()].sort((a, b) => {
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b, 'sl');
  });
  const hasAlbums = albumNames.some(Boolean);

  // Vsaka pesem dobi svoj kontejner; id-ji so po indeksih (imena lahko vsebujejo poljubne znake)
  const songContainers = [];
  demoList.innerHTML = albumNames.map(albumName => `
    ${hasAlbums ? `<h2 style="margin:28px 0 12px;">${albumName || 'Ostale pesmi'}</h2>` : ''}
    ${[...albums.get(albumName)].map(([song, versions]) => {
      const idx = songContainers.push(versions) - 1;
      return `
        <div class="admin-list-item" style="flex-direction:column; align-items:stretch;">
          <strong style="margin-bottom:12px; font-size:1.1rem;">${song}</strong>
          <div id="song-${idx}" style="display:flex; flex-direction:column; gap:12px;"></div>
        </div>`;
    }).join('')}
  `).join('');

  // Demo datoteke so v R2; Worker preveri Supabase sejo (token v URL-ju, ker <audio> ne pošilja glave)
  const { data: { session } } = await supabaseClani.auth.getSession();

  for (let idx = 0; idx < songContainers.length; idx++) {
    const container = document.getElementById(`song-${idx}`);
    for (const demo of songContainers[idx]) {
      const signError = !session;
      const signed = session
        ? { signedUrl: `${FILES_WORKER_URL}/demos/${encodeURI(demo.file_path)}?token=${session.access_token}` }
        : null;

      const row = document.createElement('div');
      row.className = 'audio-row';
      row.innerHTML = `
        <div class="audio-info">
          <h3>${demo.version_label}</h3>
          <p>${demo.opis || ''}</p>
        </div>
        ${signError
          ? `<span class="form-error">Napaka pri nalaganju posnetka</span>`
          : `<div style="display:flex; flex-direction:column; gap:8px; align-items:flex-start;">
               <audio controls preload="metadata"><source src="${signed.signedUrl}" type="audio/mpeg"></audio>
               <a class="btn" href="${signed.signedUrl}&download=1" download>⬇ Prenesi</a>
             </div>`
        }
      `;
      container.appendChild(row);
    }
  }
}

function cssSafe(str) {
  return str.replace(/[^a-zA-Z0-9]/g, '-');
}

(async function init() {
  const { data: { session } } = await supabaseClani.auth.getSession();
  if (session) showDashboard(); else showLogin();
})();
