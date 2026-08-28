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

  const songs = {};
  (data || []).forEach(d => {
    if (!songs[d.song]) songs[d.song] = [];
    songs[d.song].push(d);
  });

  const songNames = Object.keys(songs);
  if (songNames.length === 0) {
    demoList.innerHTML = '<p>Trenutno ni dodanih demo posnetkov.</p>';
    return;
  }

  demoList.innerHTML = songNames.map(song => `
    <div class="admin-list-item" style="flex-direction:column; align-items:stretch;">
      <strong style="margin-bottom:12px; font-size:1.1rem;">${song}</strong>
      <div id="song-${cssSafe(song)}" style="display:flex; flex-direction:column; gap:12px;"></div>
    </div>
  `).join('');

  for (const song of songNames) {
    const container = document.getElementById(`song-${cssSafe(song)}`);
    for (const demo of songs[song]) {
      const { data: signed, error: signError } = await supabaseClani
        .storage
        .from('demos')
        .createSignedUrl(demo.file_path, 3600);

      const row = document.createElement('div');
      row.className = 'audio-row';
      row.innerHTML = `
        <div class="audio-info">
          <h3>${demo.version_label}</h3>
          <p>${demo.opis || ''}</p>
        </div>
        ${signError
          ? `<span class="form-error">Napaka pri nalaganju posnetka</span>`
          : `<audio controls><source src="${signed.signedUrl}" type="audio/mpeg"></audio>`
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
