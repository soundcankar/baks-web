const supabaseAdmin = supabase.createClient(
  'https://heltbjqwskckqifznlml.supabase.co',
  'sb_publishable_vEHhXtkpJq8ndMFvXGK0zg_ok4i8Kqn'
);

const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

function showLogin() {
  loginView.hidden = false;
  dashboardView.hidden = true;
}

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
  loadNoviceList();
  loadPosnetkiList();
  loadSettingsForm();
  loadLinksList();
  loadBackgroundsList();
  loadGalleryAdminList();
  loadAlbumsOrderList();
  loadDemoAdminList();
  loadStats();
  loadSponsorsList();
}

// Preveri vlogo ob VSAKI spremembi seje (prijava, obstoječa seja ob nalaganju strani, ...),
// ne samo ob kliku na "Prijava" - sicer bi že prijavljen član (npr. iz clani.html) lahko
// prišel naravnost na admin.html brez preverjanja.
async function checkAdminAndRender(session) {
  if (!session) {
    showLogin();
    return;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== 'admin') {
    await supabaseAdmin.auth.signOut();
    loginError.textContent = 'Ta račun nima admin dostopa.';
    loginError.hidden = false;
    showLogin();
    return;
  }

  showDashboard();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const { error } = await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (error) {
      loginError.textContent = 'Napaka: ' + error.message;
      loginError.hidden = false;
    }
  } catch (err) {
    loginError.textContent = 'Napaka pri povezavi s strežnikom: ' + err.message + ' (odpri stran preko Live Server namesto direktno kot datoteko, in preveri konzolo z F12).';
    loginError.hidden = false;
    console.error(err);
  }
});

logoutBtn.addEventListener('click', () => supabaseAdmin.auth.signOut());

supabaseAdmin.auth.onAuthStateChange((_event, session) => {
  checkAdminAndRender(session);
});

// -----------------------------
// Zavihki
// -----------------------------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// -----------------------------
// Pomožna funkcija: nalaganje datoteke v Storage
// -----------------------------
// Datoteke so v Cloudflare R2 (Supabase Storage je presegel brezplačen promet).
// NASTAVI po objavi Workerja in vklopu javnega dostopa do R2 bucketa:
const FILES_WORKER_URL = 'https://baks-files.bals-skupine.workers.dev';
const R2_PUBLIC_URL = 'https://pub-639091bcb06e41f3980d287948208687.r2.dev';

async function uploadToR2(bucket, file, folder) {
  const { data: { session } } = await supabaseAdmin.auth.getSession();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${Date.now()}-${safeName}`;
  const res = await fetch(`${FILES_WORKER_URL}/upload/${bucket}/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });
  if (!res.ok) throw new Error('Nalaganje ni uspelo: ' + (await res.text()));
  return path;
}

async function uploadMedia(file, folder) {
  const path = await uploadToR2('media', file, folder);
  return `${R2_PUBLIC_URL}/media/${path}`;
}

// Zaseben bucket 'demos' - vrne pot v bucketu, ne javnega URL-ja
async function uploadPrivateFile(file, folder) {
  return uploadToR2('demos', file, folder);
}

// -----------------------------
// NOVICE
// -----------------------------
const noviceForm = document.getElementById('novice-form');
const noviceIdField = document.getElementById('novice-id');
const noviceTitleField = document.getElementById('novice-title');
const noviceContentField = document.getElementById('novice-content');
const noviceImageField = document.getElementById('novice-image');
const noviceStatus = document.getElementById('novice-status');
const noviceCancelBtn = document.getElementById('novice-cancel');
const noviceList = document.getElementById('novice-list');

let noviceExistingImageUrl = null;

function resetNoviceForm() {
  noviceForm.reset();
  noviceIdField.value = '';
  noviceExistingImageUrl = null;
  noviceCancelBtn.hidden = true;
  noviceStatus.textContent = '';
}

noviceCancelBtn.addEventListener('click', resetNoviceForm);

async function loadNoviceList() {
  const { data, error } = await supabaseAdmin
    .from('novice')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    noviceList.innerHTML = `<p class="form-error">Napaka: ${error.message}</p>`;
    return;
  }

  noviceList.innerHTML = (data || []).map(n => `
    <div class="admin-list-item">
      <div class="item-info">
        <strong>${n.title}</strong>
        <span>${new Date(n.created_at).toLocaleDateString()}</span>
      </div>
      <div class="item-actions">
        <button data-edit="${n.id}">Uredi</button>
        <button data-delete="${n.id}" class="danger">Izbriši</button>
      </div>
    </div>
  `).join('') || '<p>Ni še dodanih novic.</p>';

  noviceList.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = data.find(n => String(n.id) === btn.dataset.edit);
      if (!item) return;
      noviceIdField.value = item.id;
      noviceTitleField.value = item.title;
      noviceContentField.value = item.content;
      noviceExistingImageUrl = item.image_url;
      noviceCancelBtn.hidden = false;
      window.scrollTo({ top: noviceForm.offsetTop - 20, behavior: 'smooth' });
    });
  });

  noviceList.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Izbrišem to novico?')) return;
      const { error } = await supabaseAdmin.from('novice').delete().eq('id', btn.dataset.delete);
      if (error) alert('Napaka pri brisanju: ' + error.message);
      loadNoviceList();
    });
  });
}

noviceForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  noviceStatus.textContent = 'Shranjujem …';

  try {
    let image_url = noviceExistingImageUrl;
    if (noviceImageField.files[0]) {
      image_url = await uploadMedia(noviceImageField.files[0], 'novice');
    }

    const payload = {
      title: noviceTitleField.value,
      content: noviceContentField.value,
      image_url
    };

    let error;
    if (noviceIdField.value) {
      ({ error } = await supabaseAdmin.from('novice').update(payload).eq('id', noviceIdField.value));
    } else {
      ({ error } = await supabaseAdmin.from('novice').insert(payload));
    }

    if (error) throw error;

    noviceStatus.textContent = 'Shranjeno.';
    resetNoviceForm();
    loadNoviceList();
  } catch (err) {
    noviceStatus.textContent = 'Napaka: ' + err.message;
  }
});

// -----------------------------
// POSNETKI
// -----------------------------
const posnetkiForm = document.getElementById('posnetki-form');
const posnetkiIdField = document.getElementById('posnetki-id');
const posnetkiTypeField = document.getElementById('posnetki-type');
const posnetkiAlbumField = document.getElementById('posnetki-album');
const posnetkiAlbumWrap = document.getElementById('posnetki-album-wrap');
const posnetkiNaslovField = document.getElementById('posnetki-naslov');
const posnetkiOpisField = document.getElementById('posnetki-opis');
const posnetkiFileField = document.getElementById('posnetki-file');
const posnetkiYoutubeField = document.getElementById('posnetki-youtube');
const posnetkiYoutubeWrap = document.getElementById('posnetki-youtube-wrap');
const posnetkiStatus = document.getElementById('posnetki-status');
const posnetkiCancelBtn = document.getElementById('posnetki-cancel');
const posnetkiList = document.getElementById('posnetki-list');

let posnetkiExistingFileUrl = null;

function updatePosnetkiFieldVisibility() {
  const isAudio = posnetkiTypeField.value === 'audio';
  posnetkiAlbumWrap.style.display = isAudio ? '' : 'none';
  posnetkiYoutubeWrap.style.display = isAudio ? 'none' : '';
}

posnetkiTypeField.addEventListener('change', updatePosnetkiFieldVisibility);
updatePosnetkiFieldVisibility();

function resetPosnetkiForm() {
  posnetkiForm.reset();
  posnetkiIdField.value = '';
  posnetkiExistingFileUrl = null;
  posnetkiCancelBtn.hidden = true;
  posnetkiStatus.textContent = '';
  updatePosnetkiFieldVisibility();
}

posnetkiCancelBtn.addEventListener('click', resetPosnetkiForm);

async function loadPosnetkiList() {
  const { data, error } = await supabaseAdmin
    .from('posnetki')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    posnetkiList.innerHTML = `<p class="form-error">Napaka: ${error.message}</p>`;
    return;
  }

  const all = data || [];
  const videos = all.filter(p => p.type === 'video');
  const albums = {};
  all.filter(p => p.type === 'audio').forEach(p => {
    if (!albums[p.album]) albums[p.album] = [];
    albums[p.album].push(p);
  });

  const itemRow = (p, showReorder, index, total) => `
    <div class="admin-list-item">
      <div class="item-info">
        <strong>${p.naslov}</strong>
        <span>${p.type}${p.album ? ' · ' + p.album : ''}</span>
      </div>
      <div class="item-actions">
        ${showReorder ? `
          <button data-track-up="${p.id}" ${index === 0 ? 'disabled' : ''}>&uarr;</button>
          <button data-track-down="${p.id}" ${index === total - 1 ? 'disabled' : ''}>&darr;</button>
        ` : ''}
        <button data-edit="${p.id}">Uredi</button>
        <button data-delete="${p.id}" class="danger">Izbriši</button>
      </div>
    </div>
  `;

  let html = '';

  if (videos.length > 0) {
    html += '<h3 style="margin:0 0 10px;">Video</h3>';
    html += videos.map(p => itemRow(p, false)).join('');
  }

  const albumNames = Object.keys(albums);
  albumNames.forEach((albumName, ai) => {
    const tracks = albums[albumName];
    html += `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin:24px 0 10px;">
        <h3 style="margin:0;">${albumName}</h3>
        <button data-album-delete="${ai}" class="danger">Odstrani album</button>
      </div>`;
    html += tracks.map((p, index) => itemRow(p, true, index, tracks.length)).join('');
  });

  posnetkiList.innerHTML = html || '<p>Ni še dodanih posnetkov.</p>';

  // Odstrani celoten album (vse pesmi + vnos albuma s sliko in vrstnim redom)
  posnetkiList.querySelectorAll('[data-album-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const albumName = albumNames[btn.dataset.albumDelete];
      const count = albums[albumName].length;
      if (!confirm(`Odstranim album "${albumName}" in vseh ${count} posnetkov v njem?`)) return;

      const tracksRes = await supabaseAdmin.from('posnetki').delete().eq('type', 'audio').eq('album', albumName);
      if (tracksRes.error) { alert('Napaka pri brisanju: ' + tracksRes.error.message); return; }
      const albumRes = await supabaseAdmin.from('albums').delete().eq('name', albumName);
      if (albumRes.error) alert('Napaka pri brisanju albuma: ' + albumRes.error.message);

      loadPosnetkiList();
      loadAlbumsOrderList();
    });
  });

  posnetkiList.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = all.find(p => String(p.id) === btn.dataset.edit);
      if (!item) return;
      posnetkiIdField.value = item.id;
      posnetkiTypeField.value = item.type;
      posnetkiAlbumField.value = item.album || '';
      posnetkiNaslovField.value = item.naslov;
      posnetkiOpisField.value = item.opis || '';
      posnetkiExistingFileUrl = item.file_url;
      posnetkiYoutubeField.value = item.type === 'video' ? (item.file_url || '') : '';
      posnetkiCancelBtn.hidden = false;
      updatePosnetkiFieldVisibility();
      window.scrollTo({ top: posnetkiForm.offsetTop - 20, behavior: 'smooth' });
    });
  });

  posnetkiList.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Izbrišem ta posnetek?')) return;
      const { error } = await supabaseAdmin.from('posnetki').delete().eq('id', btn.dataset.delete);
      if (error) alert('Napaka pri brisanju: ' + error.message);
      loadPosnetkiList();
    });
  });

  // Ponovno oštevilči sort_order vseh pesmi v albumu glede na trenutni vrstni red v seznamu
  // (namesto zamenjave surovih vrednosti, ki so lahko vse enake in bi zamenjava bila brez učinka).
  async function reorderTracks(tracks, indexA, indexB) {
    const reordered = [...tracks];
    [reordered[indexA], reordered[indexB]] = [reordered[indexB], reordered[indexA]];

    const results = await Promise.all(
      reordered.map((p, i) => supabaseAdmin.from('posnetki').update({ sort_order: i }).eq('id', p.id))
    );
    const failed = results.find(r => r.error);
    if (failed) alert('Napaka pri urejanju vrstnega reda: ' + failed.error.message);
    loadPosnetkiList();
  }

  posnetkiList.querySelectorAll('[data-track-up]').forEach(btn => {
    btn.addEventListener('click', () => {
      const track = all.find(p => String(p.id) === btn.dataset.trackUp);
      const tracks = albums[track.album];
      const index = tracks.findIndex(p => String(p.id) === btn.dataset.trackUp);
      if (index > 0) reorderTracks(tracks, index, index - 1);
    });
  });

  posnetkiList.querySelectorAll('[data-track-down]').forEach(btn => {
    btn.addEventListener('click', () => {
      const track = all.find(p => String(p.id) === btn.dataset.trackDown);
      const tracks = albums[track.album];
      const index = tracks.findIndex(p => String(p.id) === btn.dataset.trackDown);
      if (index < tracks.length - 1) reorderTracks(tracks, index, index + 1);
    });
  });
}

posnetkiForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  posnetkiStatus.textContent = 'Shranjujem …';

  try {
    let file_url = posnetkiExistingFileUrl;

    if (posnetkiFileField.files[0]) {
      file_url = await uploadMedia(posnetkiFileField.files[0], 'posnetki');
    } else if (posnetkiTypeField.value === 'video' && posnetkiYoutubeField.value) {
      file_url = posnetkiYoutubeField.value;
    }

    if (!file_url) throw new Error('Dodaj datoteko ali YouTube povezavo.');

    const payload = {
      type: posnetkiTypeField.value,
      album: posnetkiTypeField.value === 'audio' ? posnetkiAlbumField.value : null,
      naslov: posnetkiNaslovField.value,
      opis: posnetkiOpisField.value,
      file_url
    };

    let error;
    if (posnetkiIdField.value) {
      ({ error } = await supabaseAdmin.from('posnetki').update(payload).eq('id', posnetkiIdField.value));
    } else {
      ({ error } = await supabaseAdmin.from('posnetki').insert(payload));
    }

    if (error) throw error;

    if (payload.type === 'audio' && payload.album) {
      await supabaseAdmin
        .from('albums')
        .upsert({ name: payload.album }, { onConflict: 'name', ignoreDuplicates: true });
    }

    posnetkiStatus.textContent = 'Shranjeno.';
    resetPosnetkiForm();
    loadPosnetkiList();
    loadAlbumsOrderList();
  } catch (err) {
    posnetkiStatus.textContent = 'Napaka: ' + err.message;
  }
});

// -----------------------------
// VRSTNI RED ALBUMOV
// -----------------------------
const albumsOrderList = document.getElementById('albums-order-list');

async function loadAlbumsOrderList() {
  const { data, error } = await supabaseAdmin
    .from('albums')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    albumsOrderList.innerHTML = `<p class="form-error">Napaka: ${error.message}</p>`;
    return;
  }

  const albums = data || [];

  albumsOrderList.innerHTML = albums.map((a, index) => `
    <div class="admin-list-item">
      <div class="item-info">
        <strong>${a.name}</strong>
        <span>${a.image_url ? 'Slika nastavljena' : 'Ni slike'}</span>
        <input type="file" accept="image/*" data-album-file="${a.name}" style="margin-top:8px;">
      </div>
      <div class="item-actions">
        <button data-move-up="${a.name}" ${index === 0 ? 'disabled' : ''}>&uarr;</button>
        <button data-move-down="${a.name}" ${index === albums.length - 1 ? 'disabled' : ''}>&darr;</button>
        <button data-album-save="${a.name}">Shrani sliko</button>
        <button data-album-remove="${a.name}" class="danger">Odstrani sliko</button>
      </div>
    </div>
  `).join('') || '<p>Ni še albumov (dodaj audio posnetek z imenom albuma).</p>';

  albumsOrderList.querySelectorAll('[data-album-save]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const name = btn.dataset.albumSave;
      const fileInput = albumsOrderList.querySelector(`[data-album-file="${name}"]`);
      const file = fileInput.files[0];

      if (!file) {
        alert('Najprej izberi sliko.');
        return;
      }

      try {
        const image_url = await uploadMedia(file, 'albums');
        const { error } = await supabaseAdmin.from('albums').update({ image_url }).eq('name', name);
        if (error) throw error;
        loadAlbumsOrderList();
      } catch (err) {
        alert('Napaka: ' + err.message);
      }
    });
  });

  albumsOrderList.querySelectorAll('[data-album-remove]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const name = btn.dataset.albumRemove;
      if (!confirm('Odstranim sliko tega albuma?')) return;
      const { error } = await supabaseAdmin.from('albums').update({ image_url: null }).eq('name', name);
      if (error) alert('Napaka: ' + error.message);
      loadAlbumsOrderList();
    });
  });

  // Ponovno oštevilči sort_order vseh albumov glede na trenutni vrstni red v seznamu
  // (namesto zamenjave surovih vrednosti, ki so lahko vse enake in bi zamenjava bila brez učinka).
  async function reorderAlbums(indexA, indexB) {
    const reordered = [...albums];
    [reordered[indexA], reordered[indexB]] = [reordered[indexB], reordered[indexA]];

    const results = await Promise.all(
      reordered.map((a, i) => supabaseAdmin.from('albums').update({ sort_order: i }).eq('name', a.name))
    );
    const failed = results.find(r => r.error);
    if (failed) alert('Napaka pri urejanju vrstnega reda: ' + failed.error.message);
    loadAlbumsOrderList();
  }

  albumsOrderList.querySelectorAll('[data-move-up]').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = albums.findIndex(a => a.name === btn.dataset.moveUp);
      if (index > 0) reorderAlbums(index, index - 1);
    });
  });

  albumsOrderList.querySelectorAll('[data-move-down]').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = albums.findIndex(a => a.name === btn.dataset.moveDown);
      if (index < albums.length - 1) reorderAlbums(index, index + 1);
    });
  });
}

// -----------------------------
// SETTINGS (info o bandu)
// -----------------------------
const settingsForm = document.getElementById('settings-form');
const settingsTaglineField = document.getElementById('settings-tagline');
const settingsAboutField = document.getElementById('settings-about');
const settingsMembersField = document.getElementById('settings-members');
const settingsPhotoField = document.getElementById('settings-photo');
const settingsStatus = document.getElementById('settings-status');

let settingsExistingPhotoUrl = null;

async function loadSettingsForm() {
  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    settingsStatus.textContent = 'Napaka: ' + error.message;
    return;
  }
  if (!data) return;

  settingsTaglineField.value = data.hero_tagline || '';
  settingsAboutField.value = data.about_text || '';
  settingsMembersField.value = Array.isArray(data.members) ? data.members.join('\n') : '';
  settingsExistingPhotoUrl = data.band_photo_url || null;
}

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  settingsStatus.textContent = 'Shranjujem …';

  try {
    const members = settingsMembersField.value
      .split('\n')
      .map(m => m.trim())
      .filter(Boolean);

    let band_photo_url = settingsExistingPhotoUrl;
    if (settingsPhotoField.files[0]) {
      band_photo_url = await uploadMedia(settingsPhotoField.files[0], 'band');
    }

    const { error } = await supabaseAdmin
      .from('settings')
      .upsert({
        id: 1,
        hero_tagline: settingsTaglineField.value,
        about_text: settingsAboutField.value,
        members,
        band_photo_url
      });

    if (error) throw error;

    settingsStatus.textContent = 'Shranjeno.';
    settingsPhotoField.value = '';
    loadSettingsForm();
  } catch (err) {
    settingsStatus.textContent = 'Napaka: ' + err.message;
  }
});

// -----------------------------
// LINKS (povezave)
// -----------------------------
const linksForm = document.getElementById('links-form');
const linksLabelField = document.getElementById('links-label');
const linksUrlField = document.getElementById('links-url');
const linksSortField = document.getElementById('links-sort');
const linksStatus = document.getElementById('links-status');
const linksList = document.getElementById('links-list');

async function loadLinksList() {
  const { data, error } = await supabaseAdmin
    .from('links')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    linksList.innerHTML = `<p class="form-error">Napaka: ${error.message}</p>`;
    return;
  }

  linksList.innerHTML = (data || []).map(l => `
    <div class="admin-list-item">
      <div class="item-info">
        <strong>${l.label}</strong>
        <span>${l.url}</span>
      </div>
      <div class="item-actions">
        <button data-delete="${l.id}" class="danger">Izbriši</button>
      </div>
    </div>
  `).join('') || '<p>Ni še dodanih povezav.</p>';

  linksList.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Izbrišem to povezavo?')) return;
      const { error } = await supabaseAdmin.from('links').delete().eq('id', btn.dataset.delete);
      if (error) alert('Napaka pri brisanju: ' + error.message);
      loadLinksList();
    });
  });
}

linksForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  linksStatus.textContent = 'Dodajam …';

  const { error } = await supabaseAdmin.from('links').insert({
    label: linksLabelField.value,
    url: linksUrlField.value,
    sort_order: Number(linksSortField.value) || 0
  });

  if (error) {
    linksStatus.textContent = 'Napaka: ' + error.message;
  } else {
    linksStatus.textContent = 'Dodano.';
    linksForm.reset();
    linksSortField.value = 1;
    loadLinksList();
  }
});

// -----------------------------
// GALERIJA (slike dogodkov)
// -----------------------------
const galleryForm = document.getElementById('gallery-form');
const galleryEventField = document.getElementById('gallery-event');
const galleryFilesField = document.getElementById('gallery-files');
const galleryStatus = document.getElementById('gallery-status');
const galleryAdminList = document.getElementById('gallery-admin-list');

const galleryEventsDatalist = document.getElementById('gallery-event-options');

// Dogodki po vrstnem redu: [{ name, images: [...] }, ...]
let galleryEvents = [];

async function loadGalleryAdminList() {
  const { data, error } = await supabaseAdmin
    .from('gallery')
    .select('*')
    .order('event_order', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    galleryAdminList.innerHTML = `<p class="form-error">Napaka: ${error.message}</p>`;
    return;
  }

  // Map ohrani vrstni red vstavljanja (objekt bi imena kot "2026" razvrstil po številki)
  const events = new Map();
  (data || []).forEach(img => {
    if (!events.has(img.event_name)) events.set(img.event_name, []);
    events.get(img.event_name).push(img);
  });
  galleryEvents = Array.from(events, ([name, images]) => ({ name, images }));

  galleryEventsDatalist.innerHTML = galleryEvents.map(ev => `<option value="${ev.name}"></option>`).join('');

  galleryAdminList.innerHTML = galleryEvents.map((ev, ei) => `
    <div class="admin-list-item" style="flex-direction:column; align-items:stretch;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
        <strong>${ev.name}</strong>
        <div class="item-actions">
          <button data-event-up="${ei}" ${ei === 0 ? 'disabled' : ''}>&uarr;</button>
          <button data-event-down="${ei}" ${ei === galleryEvents.length - 1 ? 'disabled' : ''}>&darr;</button>
          <button data-event-add="${ei}">Dodaj slike</button>
          <button data-event-remove="${ei}" class="danger">Odstrani mapo</button>
          <input type="file" accept="image/*" multiple hidden data-event-files="${ei}">
        </div>
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:10px;">
        ${ev.images.map((img, ii) => `
          <div style="position:relative;">
            <img src="${img.image_url}" alt="" style="width:90px; height:90px; object-fit:cover; border-radius:6px;">
            <button data-delete-image="${img.id}" class="danger" style="position:absolute; top:4px; right:4px; padding:2px 6px; font-size:0.75rem;">✕</button>
            <div style="display:flex; justify-content:center; gap:4px; margin-top:4px;">
              <button data-img-left="${ei}:${ii}" ${ii === 0 ? 'disabled' : ''} style="padding:2px 8px;">&larr;</button>
              <button data-img-right="${ei}:${ii}" ${ii === ev.images.length - 1 ? 'disabled' : ''} style="padding:2px 8px;">&rarr;</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('') || '<p>Ni še dodanih fotografij.</p>';

  galleryAdminList.querySelectorAll('[data-delete-image]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Izbrišem to sliko?')) return;
      const { error } = await supabaseAdmin.from('gallery').delete().eq('id', btn.dataset.deleteImage);
      if (error) alert('Napaka pri brisanju: ' + error.message);
      loadGalleryAdminList();
    });
  });

  // Odstrani celotno mapo (vse slike dogodka)
  galleryAdminList.querySelectorAll('[data-event-remove]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ev = galleryEvents[btn.dataset.eventRemove];
      if (!confirm(`Odstranim mapo "${ev.name}" in vseh ${ev.images.length} slik v njej?`)) return;
      const { error } = await supabaseAdmin.from('gallery').delete().eq('event_name', ev.name);
      if (error) alert('Napaka pri brisanju: ' + error.message);
      loadGalleryAdminList();
    });
  });

  // Dodajanje slik v že obstoječo mapo (dogodek)
  galleryAdminList.querySelectorAll('[data-event-add]').forEach(btn => {
    const fileInput = galleryAdminList.querySelector(`[data-event-files="${btn.dataset.eventAdd}"]`);
    btn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      if (!fileInput.files.length) return;
      btn.disabled = true;
      btn.textContent = 'Nalagam …';
      try {
        await addGalleryImages(galleryEvents[btn.dataset.eventAdd].name, Array.from(fileInput.files));
      } catch (err) {
        alert('Napaka: ' + err.message);
      }
      loadGalleryAdminList();
    });
  });

  // Ponovno oštevilči vrstni red glede na trenutni seznam (surove vrednosti so lahko vse enake)
  async function saveEventOrder(order) {
    const results = await Promise.all(
      order.map((ev, i) => supabaseAdmin.from('gallery').update({ event_order: i }).eq('event_name', ev.name))
    );
    const failed = results.find(r => r.error);
    if (failed) alert('Napaka pri urejanju vrstnega reda: ' + failed.error.message);
    loadGalleryAdminList();
  }

  async function saveImageOrder(images) {
    const results = await Promise.all(
      images.map((img, i) => supabaseAdmin.from('gallery').update({ sort_order: i }).eq('id', img.id))
    );
    const failed = results.find(r => r.error);
    if (failed) alert('Napaka pri urejanju vrstnega reda: ' + failed.error.message);
    loadGalleryAdminList();
  }

  function swapped(list, a, b) {
    const copy = [...list];
    [copy[a], copy[b]] = [copy[b], copy[a]];
    return copy;
  }

  galleryAdminList.querySelectorAll('[data-event-up]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.eventUp);
      saveEventOrder(swapped(galleryEvents, i, i - 1));
    });
  });
  galleryAdminList.querySelectorAll('[data-event-down]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.eventDown);
      saveEventOrder(swapped(galleryEvents, i, i + 1));
    });
  });
  galleryAdminList.querySelectorAll('[data-img-left]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [ei, ii] = btn.dataset.imgLeft.split(':').map(Number);
      saveImageOrder(swapped(galleryEvents[ei].images, ii, ii - 1));
    });
  });
  galleryAdminList.querySelectorAll('[data-img-right]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [ei, ii] = btn.dataset.imgRight.split(':').map(Number);
      saveImageOrder(swapped(galleryEvents[ei].images, ii, ii + 1));
    });
  });
}

// Doda slike na konec obstoječega dogodka; nov dogodek se uvrsti na vrh.
async function addGalleryImages(eventName, files) {
  const existing = galleryEvents.find(ev => ev.name === eventName);
  const eventOrder = existing
    ? existing.images[0].event_order
    : Math.min(0, ...galleryEvents.map(ev => ev.images[0].event_order)) - 1;
  let nextSort = existing ? Math.max(...existing.images.map(img => img.sort_order)) + 1 : 0;

  for (const file of files) {
    const image_url = await uploadMedia(file, 'gallery');
    const { error } = await supabaseAdmin.from('gallery').insert({
      event_name: eventName,
      image_url,
      event_order: eventOrder,
      sort_order: nextSort++
    });
    if (error) throw error;
  }
}

galleryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  galleryStatus.textContent = 'Nalagam …';

  try {
    await addGalleryImages(galleryEventField.value.trim(), Array.from(galleryFilesField.files));

    galleryStatus.textContent = 'Naloženo.';
    galleryForm.reset();
    loadGalleryAdminList();
  } catch (err) {
    galleryStatus.textContent = 'Napaka: ' + err.message;
  }
});

// -----------------------------
// POKROVITELJI
// -----------------------------
const sponsorsForm = document.getElementById('sponsors-form');
const sponsorsIdField = document.getElementById('sponsors-id');
const sponsorsNameField = document.getElementById('sponsors-name');
const sponsorsLogoField = document.getElementById('sponsors-logo');
const sponsorsWebsiteField = document.getElementById('sponsors-website');
const sponsorsSortField = document.getElementById('sponsors-sort');
const sponsorsStatus = document.getElementById('sponsors-status');
const sponsorsCancelBtn = document.getElementById('sponsors-cancel');
const sponsorsList = document.getElementById('sponsors-list');

let sponsorsExistingLogoUrl = null;

function resetSponsorsForm() {
  sponsorsForm.reset();
  sponsorsIdField.value = '';
  sponsorsExistingLogoUrl = null;
  sponsorsCancelBtn.hidden = true;
  sponsorsStatus.textContent = '';
  sponsorsSortField.value = 1;
}

sponsorsCancelBtn.addEventListener('click', resetSponsorsForm);

async function loadSponsorsList() {
  if (!sponsorsList) return;

  const { data, error } = await supabaseAdmin
    .from('sponsors')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    sponsorsList.innerHTML = `<p class="form-error">Napaka: ${error.message}</p>`;
    return;
  }

  const all = data || [];

  sponsorsList.innerHTML = all.map(s => `
    <div class="admin-list-item">
      <img src="${s.logo_url}" alt="${s.name}" style="height:40px; width:auto; object-fit:contain;">
      <div class="item-info">
        <strong>${s.name}</strong>
        <span>${s.website_url || ''}</span>
      </div>
      <div class="item-actions">
        <button data-edit="${s.id}">Uredi</button>
        <button data-delete="${s.id}" class="danger">Izbriši</button>
      </div>
    </div>
  `).join('') || '<p>Ni še dodanih pokroviteljev.</p>';

  sponsorsList.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = all.find(s => String(s.id) === btn.dataset.edit);
      if (!item) return;
      sponsorsIdField.value = item.id;
      sponsorsNameField.value = item.name;
      sponsorsWebsiteField.value = item.website_url || '';
      sponsorsSortField.value = item.sort_order || 1;
      sponsorsExistingLogoUrl = item.logo_url;
      sponsorsCancelBtn.hidden = false;
      window.scrollTo({ top: sponsorsForm.offsetTop - 20, behavior: 'smooth' });
    });
  });

  sponsorsList.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Izbrišem tega pokrovitelja?')) return;
      const { error } = await supabaseAdmin.from('sponsors').delete().eq('id', btn.dataset.delete);
      if (error) alert('Napaka pri brisanju: ' + error.message);
      loadSponsorsList();
    });
  });
}

sponsorsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  sponsorsStatus.textContent = 'Shranjujem …';

  try {
    let logo_url = sponsorsExistingLogoUrl;
    if (sponsorsLogoField.files[0]) {
      logo_url = await uploadMedia(sponsorsLogoField.files[0], 'sponsors');
    }

    if (!logo_url) throw new Error('Dodaj logotip.');

    const payload = {
      name: sponsorsNameField.value,
      logo_url,
      website_url: sponsorsWebsiteField.value || null,
      sort_order: Number(sponsorsSortField.value) || 0
    };

    let error;
    if (sponsorsIdField.value) {
      ({ error } = await supabaseAdmin.from('sponsors').update(payload).eq('id', sponsorsIdField.value));
    } else {
      ({ error } = await supabaseAdmin.from('sponsors').insert(payload));
    }

    if (error) throw error;

    sponsorsStatus.textContent = 'Shranjeno.';
    resetSponsorsForm();
    loadSponsorsList();
  } catch (err) {
    sponsorsStatus.textContent = 'Napaka: ' + err.message;
  }
});

// -----------------------------
// DEMO (zasebni posnetki za člane)
// -----------------------------
const demoForm = document.getElementById('demo-form');
const demoIdField = document.getElementById('demo-id');
const demoSongField = document.getElementById('demo-song');
const demoVersionField = document.getElementById('demo-version');
const demoOpisField = document.getElementById('demo-opis');
const demoFileField = document.getElementById('demo-file');
const demoStatus = document.getElementById('demo-status');
const demoCancelBtn = document.getElementById('demo-cancel');
const demoAdminList = document.getElementById('demo-admin-list');

let demoExistingFilePath = null;

function resetDemoForm() {
  demoForm.reset();
  demoIdField.value = '';
  demoExistingFilePath = null;
  demoCancelBtn.hidden = true;
  demoStatus.textContent = '';
}

demoCancelBtn.addEventListener('click', resetDemoForm);

async function loadDemoAdminList() {
  const { data, error } = await supabaseAdmin
    .from('demos')
    .select('*')
    .order('song', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    demoAdminList.innerHTML = `<p class="form-error">Napaka: ${error.message}</p>`;
    return;
  }

  const all = data || [];

  demoAdminList.innerHTML = all.map(d => `
    <div class="admin-list-item">
      <div class="item-info">
        <strong>${d.song}</strong>
        <span>${d.version_label}</span>
      </div>
      <div class="item-actions">
        <button data-edit="${d.id}">Uredi</button>
        <button data-delete="${d.id}" class="danger">Izbriši</button>
      </div>
    </div>
  `).join('') || '<p>Ni še dodanih demo posnetkov.</p>';

  demoAdminList.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = all.find(d => String(d.id) === btn.dataset.edit);
      if (!item) return;
      demoIdField.value = item.id;
      demoSongField.value = item.song;
      demoVersionField.value = item.version_label;
      demoOpisField.value = item.opis || '';
      demoExistingFilePath = item.file_path;
      demoCancelBtn.hidden = false;
      window.scrollTo({ top: demoForm.offsetTop - 20, behavior: 'smooth' });
    });
  });

  demoAdminList.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Izbrišem ta demo posnetek?')) return;
      const { error } = await supabaseAdmin.from('demos').delete().eq('id', btn.dataset.delete);
      if (error) alert('Napaka pri brisanju: ' + error.message);
      loadDemoAdminList();
    });
  });
}

demoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  demoStatus.textContent = 'Shranjujem …';

  try {
    let file_path = demoExistingFilePath;
    if (demoFileField.files[0]) {
      file_path = await uploadPrivateFile(demoFileField.files[0], 'tracks');
    }

    if (!file_path) throw new Error('Dodaj zvočno datoteko.');

    const payload = {
      song: demoSongField.value,
      version_label: demoVersionField.value,
      opis: demoOpisField.value,
      file_path
    };

    let error;
    if (demoIdField.value) {
      ({ error } = await supabaseAdmin.from('demos').update(payload).eq('id', demoIdField.value));
    } else {
      ({ error } = await supabaseAdmin.from('demos').insert(payload));
    }

    if (error) throw error;

    demoStatus.textContent = 'Shranjeno.';
    resetDemoForm();
    loadDemoAdminList();
  } catch (err) {
    demoStatus.textContent = 'Napaka: ' + err.message;
  }
});

// -----------------------------
// OZADJA PODSTRANI
// -----------------------------
const backgroundsList = document.getElementById('backgrounds-list');
const BACKGROUND_PAGES = [
  { key: 'index', label: 'Domača stran (hero)' },
  { key: 'novice', label: 'Novice' },
  { key: 'posnetki', label: 'Posnetki' },
  { key: 'povezave', label: 'Povezave' }
];

async function loadBackgroundsList() {
  const { data, error } = await supabaseAdmin
    .from('page_backgrounds')
    .select('*');

  if (error) {
    backgroundsList.innerHTML = `<p class="form-error">Napaka: ${error.message}</p>`;
    return;
  }

  const byPage = {};
  (data || []).forEach(row => { byPage[row.page] = row.image_url; });

  backgroundsList.innerHTML = BACKGROUND_PAGES.map(p => {
    const imageUrl = byPage[p.key];
    return `
      <div class="admin-list-item">
        <div class="item-info">
          <strong>${p.label}</strong>
          <span>${imageUrl ? 'Ozadje nastavljeno' : 'Ni ozadja'}</span>
          <input type="file" accept="image/*" data-bg-file="${p.key}" style="margin-top:8px;">
        </div>
        <div class="item-actions">
          <button data-bg-save="${p.key}">Shrani</button>
          <button data-bg-remove="${p.key}" class="danger">Odstrani</button>
        </div>
      </div>
    `;
  }).join('');

  backgroundsList.querySelectorAll('[data-bg-save]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const page = btn.dataset.bgSave;
      const fileInput = backgroundsList.querySelector(`[data-bg-file="${page}"]`);
      const file = fileInput.files[0];

      if (!file) {
        alert('Najprej izberi sliko.');
        return;
      }

      try {
        const image_url = await uploadMedia(file, 'backgrounds');
        const { error } = await supabaseAdmin
          .from('page_backgrounds')
          .upsert({ page, image_url });
        if (error) throw error;
        loadBackgroundsList();
      } catch (err) {
        alert('Napaka: ' + err.message);
      }
    });
  });

  backgroundsList.querySelectorAll('[data-bg-remove]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const page = btn.dataset.bgRemove;
      if (!confirm('Odstranim ozadje za to stran?')) return;
      const { error } = await supabaseAdmin
        .from('page_backgrounds')
        .upsert({ page, image_url: null });
      if (error) alert('Napaka: ' + error.message);
      loadBackgroundsList();
    });
  });
}

// -----------------------------
// STATISTIKA (anonimni obiski - brez piškotkov/IP/identitete)
// -----------------------------
const statsSummary = document.getElementById('stats-summary');
const statsPages = document.getElementById('stats-pages');
const statsDaily = document.getElementById('stats-daily');
const statsHours = document.getElementById('stats-hours');
const statsWeekdays = document.getElementById('stats-weekdays');
const statsReferrers = document.getElementById('stats-referrers');
const statsDevices = document.getElementById('stats-devices');

const PAGE_LABELS = {
  index: 'Domov',
  novice: 'Novice',
  posnetki: 'Posnetki',
  povezave: 'Galerija'
};

// Najbolj poslušane pesmi (iz tabele track_plays, ki jo polni stran Posnetki)
async function loadTrackStats() {
  const statsTracks = document.getElementById('stats-tracks');
  if (!statsTracks) return;

  // Seštevanje poteka v bazi (funkcija track_play_stats), prenese se samo top 10
  const { data, error } = await supabaseAdmin.rpc('track_play_stats');

  if (error) {
    statsTracks.innerHTML = `<p class="form-error">Napaka: ${error.message}</p>`;
    return;
  }

  const top = (data || []).map(r => ({ naslov: r.naslov, album: r.album, count: Number(r.plays) }));

  const max = Math.max(1, ...top.map(t => t.count));
  statsTracks.innerHTML = top.map(t => `
    <div class="stats-bar-row">
      <span style="width:220px;">${t.naslov}${t.album ? ` <small style="color:var(--text-muted);">· ${t.album}</small>` : ''}</span>
      <div class="stats-bar-track"><div class="stats-bar-fill" style="width:${(t.count / max) * 100}%"></div></div>
      <span>${t.count}</span>
    </div>
  `).join('') || '<p>Ni še podatkov (štetje se začne, ko nekdo predvaja pesem).</p>';
}

async function loadStats() {
  if (!statsSummary) return;

  loadTrackStats();

  const { count: totalCount, error: countError } = await supabaseAdmin
    .from('page_views')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    statsSummary.innerHTML = `<p class="form-error">Napaka: ${countError.message}</p>`;
    return;
  }

  const { data: rows, error } = await supabaseAdmin
    .from('page_views')
    .select('page, referrer, device, browser, created_at')
    .order('created_at', { ascending: false })
    .limit(5000);

  if (error) {
    statsSummary.innerHTML = `<p class="form-error">Napaka: ${error.message}</p>`;
    return;
  }

  const all = rows || [];
  const now = new Date();
  const days7 = new Date(now); days7.setDate(days7.getDate() - 7);
  const days30 = new Date(now); days30.setDate(days30.getDate() - 30);

  const days14 = new Date(now); days14.setDate(days14.getDate() - 14);
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);

  const last7 = all.filter(r => new Date(r.created_at) >= days7).length;
  const prev7 = all.filter(r => { const d = new Date(r.created_at); return d >= days14 && d < days7; }).length;
  const last30 = all.filter(r => new Date(r.created_at) >= days30).length;
  const today = all.filter(r => new Date(r.created_at) >= startOfToday).length;

  // Trend: zadnjih 7 dni v primerjavi s prejšnjimi 7 dnevi
  let trendHtml = '';
  if (prev7 > 0) {
    const pct = Math.round(((last7 - prev7) / prev7) * 100);
    trendHtml = `<span class="stats-label" style="display:block;">${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)} % glede na prejšnji teden</span>`;
  }

  // Najboljši dan (po datumu obiska)
  const perDay = {};
  all.forEach(r => { const k = (r.created_at || '').slice(0, 10); if (k) perDay[k] = (perDay[k] || 0) + 1; });
  const bestDayKey = Object.keys(perDay).sort((a, b) => perDay[b] - perDay[a])[0];
  const bestDayHtml = bestDayKey
    ? `<div class="stats-card"><span class="stats-number">${perDay[bestDayKey]}</span><span class="stats-label">Najboljši dan (${new Date(bestDayKey).toLocaleDateString('sl-SI', { day: 'numeric', month: 'numeric', year: 'numeric' })})</span></div>`
    : '';

  statsSummary.innerHTML = `
    <div class="stats-card"><span class="stats-number">${totalCount ?? all.length}</span><span class="stats-label">Skupaj ogledov</span></div>
    <div class="stats-card"><span class="stats-number">${today}</span><span class="stats-label">Danes</span></div>
    <div class="stats-card"><span class="stats-number">${last7}</span><span class="stats-label">Zadnjih 7 dni</span>${trendHtml}</div>
    <div class="stats-card"><span class="stats-number">${last30}</span><span class="stats-label">Zadnjih 30 dni</span></div>
    <div class="stats-card"><span class="stats-number">${(last30 / 30).toFixed(1)}</span><span class="stats-label">Povprečje na dan (30 dni)</span></div>
    ${bestDayHtml}
  `;

  // Ogledi po straneh
  const byPage = {};
  all.forEach(r => { byPage[r.page] = (byPage[r.page] || 0) + 1; });
  const maxPage = Math.max(1, ...Object.values(byPage));
  statsPages.innerHTML = Object.keys(byPage).sort((a, b) => byPage[b] - byPage[a]).map(page => `
    <div class="stats-bar-row">
      <span style="width:100px;">${PAGE_LABELS[page] || page}</span>
      <div class="stats-bar-track"><div class="stats-bar-fill" style="width:${(byPage[page] / maxPage) * 100}%"></div></div>
      <span>${byPage[page]}</span>
    </div>
  `).join('') || '<p>Ni še podatkov.</p>';

  // Ogledi po dnevih (zadnjih 14 dni)
  const dayBuckets = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    dayBuckets.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('sl-SI', { day: 'numeric', month: 'numeric' }),
      count: 0
    });
  }
  all.forEach(r => {
    const key = (r.created_at || '').slice(0, 10);
    const bucket = dayBuckets.find(b => b.key === key);
    if (bucket) bucket.count++;
  });
  const maxDay = Math.max(1, ...dayBuckets.map(b => b.count));
  statsDaily.innerHTML = dayBuckets.map(b => `
    <div class="stats-chart-col" title="${b.label}: ${b.count}">
      <div class="stats-chart-bar" style="height:${(b.count / maxDay) * 100}%"></div>
      <span class="stats-chart-label">${b.label}</span>
    </div>
  `).join('');

  // Graf iz seznama { label, count } (enaka oblika kot graf po dnevih)
  const renderBars = (el, buckets) => {
    const max = Math.max(1, ...buckets.map(b => b.count));
    el.innerHTML = buckets.map(b => `
      <div class="stats-chart-col" title="${b.label}: ${b.count}">
        <div class="stats-chart-bar" style="height:${(b.count / max) * 100}%"></div>
        <span class="stats-chart-label">${b.label}</span>
      </div>
    `).join('');
  };

  // Ogledi po urah dneva (lokalni čas) - kdaj je stran najbolj obiskana
  const hourBuckets = Array.from({ length: 24 }, (_, h) => ({ label: String(h), count: 0 }));
  // Ogledi po dnevih v tednu (ponedeljek prvi)
  const weekdayLabels = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob', 'Ned'];
  const weekdayBuckets = weekdayLabels.map(label => ({ label, count: 0 }));
  all.forEach(r => {
    const d = new Date(r.created_at);
    hourBuckets[d.getHours()].count++;
    weekdayBuckets[(d.getDay() + 6) % 7].count++;
  });
  renderBars(statsHours, hourBuckets);
  renderBars(statsWeekdays, weekdayBuckets);

  // Od kod prihajajo (izključi prazne in interne napotitve iz baks.si)
  const refCounts = {};
  all.forEach(r => {
    if (!r.referrer) return;
    let host;
    try {
      host = new URL(r.referrer).hostname.replace(/^www\./, '');
    } catch (e) {
      return;
    }
    if (host.includes('baks.si')) return;
    refCounts[host] = (refCounts[host] || 0) + 1;
  });
  const topRefs = Object.entries(refCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  statsReferrers.innerHTML = topRefs.length
    ? topRefs.map(([host, count]) => `
        <div class="admin-list-item"><div class="item-info"><strong>${host}</strong></div><span>${count}</span></div>
      `).join('')
    : '<p>Ni zunanjih napotitev (obiski prihajajo neposredno).</p>';

  // Naprava / brskalnik
  const deviceCounts = {};
  const browserCounts = {};
  all.forEach(r => {
    if (r.device) deviceCounts[r.device] = (deviceCounts[r.device] || 0) + 1;
    if (r.browser) browserCounts[r.browser] = (browserCounts[r.browser] || 0) + 1;
  });
  const deviceHtml = Object.entries(deviceCounts).map(([d, c]) => `
    <div class="admin-list-item"><div class="item-info"><strong>${d === 'mobile' ? 'Mobilna naprava' : 'Računalnik'}</strong></div><span>${c}</span></div>
  `).join('');
  const browserHtml = Object.entries(browserCounts).sort((a, b) => b[1] - a[1]).map(([b, c]) => `
    <div class="admin-list-item"><div class="item-info"><strong>${b}</strong></div><span>${c}</span></div>
  `).join('');
  statsDevices.innerHTML = (deviceHtml + browserHtml) || '<p>Ni še podatkov.</p>';
}

// -----------------------------
// Init
// -----------------------------
(async function init() {
  const { data: { session } } = await supabaseAdmin.auth.getSession();
  checkAdminAndRender(session);
})();
