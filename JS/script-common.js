const supabaseCommon = supabase.createClient(
  'https://heltbjqwskckqifznlml.supabase.co',
  'sb_publishable_vEHhXtkpJq8ndMFvXGK0zg_ok4i8Kqn'
);

const SOCIAL_ICONS = {
  facebook: '<svg viewBox="0 0 24 24"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24"><path d="M12 2c2.7 0 3.1 0 4.1.1 1 .1 1.7.2 2.3.5.6.2 1.1.6 1.6 1.1.5.5.8.9 1.1 1.6.2.6.4 1.3.5 2.3.1 1 .1 1.4.1 4.1s0 3.1-.1 4.1c-.1 1-.2 1.7-.5 2.3-.2.6-.6 1.1-1.1 1.6-.5.5-.9.8-1.6 1.1-.6.2-1.3.4-2.3.5-1 .1-1.4.1-4.1.1s-3.1 0-4.1-.1c-1-.1-1.7-.2-2.3-.5-.6-.2-1.1-.6-1.6-1.1-.5-.5-.8-.9-1.1-1.6-.2-.6-.4-1.3-.5-2.3C2 15.1 2 14.7 2 12s0-3.1.1-4.1c.1-1 .2-1.7.5-2.3.2-.6.6-1.1 1.1-1.6.5-.5.9-.8 1.6-1.1.6-.2 1.3-.4 2.3-.5C8.9 2 9.3 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.2-8.4a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24"><path d="M23.5 6.6a3 3 0 0 0-2.1-2.1C19.5 4 12 4 12 4s-7.5 0-9.4.5A3 3 0 0 0 .5 6.6 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.4 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.4zM9.6 15.5v-7l6.3 3.5-6.3 3.5z"/></svg>',
  spotify: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.6 14.4c-.2.3-.6.4-.9.2-2.5-1.5-5.6-1.9-9.3-1a.7.7 0 1 1-.3-1.3c4-.9 7.5-.5 10.3 1.2.3.2.4.6.2.9zm1.2-2.8c-.2.3-.7.5-1 .3-2.8-1.7-7.1-2.2-10.4-1.2a.9.9 0 1 1-.5-1.7c3.8-1.1 8.5-.6 11.7 1.4.3.2.5.7.2 1.2zm.1-2.9C14.6 8.8 9.4 8.6 6.4 9.5a1 1 0 1 1-.6-2c3.5-1 9.3-.8 13 1.4a1 1 0 1 1-1 1.8z"/></svg>',
  default: '<svg viewBox="0 0 24 24"><path d="M3.9 12a4.1 4.1 0 0 1 4.1-4.1h3v1.8h-3a2.3 2.3 0 0 0 0 4.6h3V16h-3A4.1 4.1 0 0 1 3.9 12zM13 8h3a4.1 4.1 0 1 1 0 8.2h-3v-1.8h3a2.3 2.3 0 0 0 0-4.6h-3V8zm-4.8 5h7.6v-2H8.2v2z"/></svg>'
};

function iconForLabel(label) {
  const key = (label || '').trim().toLowerCase();
  return SOCIAL_ICONS[key] || SOCIAL_ICONS.default;
}

async function loadLinks() {
  const { data, error } = await supabaseCommon
    .from('links')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Napaka pri nalaganju povezav:', error);
    return [];
  }
  return data || [];
}

function renderHeaderSocials(links) {
  const container = document.getElementById('socials');
  if (!container) return;

  container.innerHTML = links.map(link => `
    <a href="${link.url}" target="_blank" rel="noopener" aria-label="${link.label}">
      ${iconForLabel(link.label)}
    </a>
  `).join('');
}

function renderFooterLinks(links) {
  const container = document.getElementById('footer-social-links');
  if (!container) return;

  container.innerHTML = links.map(link => `
    <li><a href="${link.url}" target="_blank" rel="noopener">${link.label}</a></li>
  `).join('');
}

function renderPovezaveList(links) {
  const container = document.getElementById('povezave-list');
  if (!container) return;

  const mediaLinks = links.filter(link => link.label.trim().toLowerCase() !== 'facebook');

  if (mediaLinks.length === 0) {
    container.innerHTML = '<p>Trenutno ni dodanih povezav.</p>';
    return;
  }

  container.innerHTML = mediaLinks.map(link => `
    <article>
      <a href="${link.url}" target="_blank" rel="noopener" style="display:flex; align-items:center; gap:16px; color:inherit; text-decoration:none;">
        <span style="width:44px; height:44px; flex-shrink:0; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg); color:var(--accent);">
          ${iconForLabel(link.label).replace('<svg ', '<svg style="width:22px;height:22px;fill:currentColor;" ')}
        </span>
        <h3 style="margin:0;">${link.label}</h3>
      </a>
    </article>
  `).join('');
}

async function loadGallery() {
  const { data, error } = await supabaseCommon
    .from('gallery')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Napaka pri nalaganju galerije:', error);
    return [];
  }
  return data || [];
}

function renderGallery(images) {
  const container = document.getElementById('gallery-list');
  if (!container) return;

  if (images.length === 0) {
    container.innerHTML = '<p>Trenutno ni dodanih fotografij.</p>';
    return;
  }

  const events = {};
  images.forEach(img => {
    if (!events[img.event_name]) events[img.event_name] = [];
    events[img.event_name].push(img);
  });

  container.innerHTML = Object.keys(events).map(eventName => `
    <article>
      <h2>${eventName}</h2>
      <div class="gallery-grid">
        ${events[eventName].map(img => `<img src="${img.image_url}" alt="${eventName}" loading="lazy">`).join('')}
      </div>
    </article>
  `).join('');

  container.querySelectorAll('.gallery-grid').forEach(grid => {
    const urls = Array.from(grid.querySelectorAll('img')).map(img => img.src);
    grid.querySelectorAll('img').forEach((img, index) => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => openLightbox(urls, index));
    });
  });
}

// -----------------------------
// Lightbox (celozaslonski pregled slik)
// -----------------------------
let lightboxUrls = [];
let lightboxIndex = 0;
let lightboxEl = null;

function buildLightbox() {
  if (lightboxEl) return lightboxEl;

  lightboxEl = document.createElement('div');
  lightboxEl.className = 'lightbox';
  lightboxEl.innerHTML = `
    <button class="lightbox-close" aria-label="Zapri">&times;</button>
    <button class="lightbox-prev" aria-label="Prejšnja">&#10094;</button>
    <img class="lightbox-img" src="" alt="">
    <button class="lightbox-next" aria-label="Naslednja">&#10095;</button>
  `;
  document.body.appendChild(lightboxEl);

  lightboxEl.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  lightboxEl.addEventListener('click', (e) => {
    if (e.target === lightboxEl) closeLightbox();
  });
  lightboxEl.querySelector('.lightbox-prev').addEventListener('click', () => showLightboxImage(lightboxIndex - 1));
  lightboxEl.querySelector('.lightbox-next').addEventListener('click', () => showLightboxImage(lightboxIndex + 1));

  document.addEventListener('keydown', (e) => {
    if (!lightboxEl.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showLightboxImage(lightboxIndex - 1);
    if (e.key === 'ArrowRight') showLightboxImage(lightboxIndex + 1);
  });

  return lightboxEl;
}

function showLightboxImage(index) {
  lightboxIndex = (index + lightboxUrls.length) % lightboxUrls.length;
  lightboxEl.querySelector('.lightbox-img').src = lightboxUrls[lightboxIndex];
}

function openLightbox(urls, startIndex) {
  lightboxUrls = urls;
  buildLightbox();
  showLightboxImage(startIndex);
  lightboxEl.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightboxEl.classList.remove('open');
  document.body.style.overflow = '';
}

async function loadSettings() {
  const { data, error } = await supabaseCommon
    .from('settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('Napaka pri nalaganju nastavitev strani:', error);
    return null;
  }
  return data;
}

function renderSettings(settings) {
  if (!settings) return;

  const tagline = document.getElementById('hero-tagline');
  if (tagline && settings.hero_tagline) tagline.textContent = settings.hero_tagline;

  const about = document.getElementById('about-text');
  if (about && settings.about_text) about.textContent = settings.about_text;

  const members = document.getElementById('members-list');
  if (members && Array.isArray(settings.members) && settings.members.length > 0) {
    members.innerHTML = settings.members.map(m => `<li>${m}</li>`).join('');
  }

  const bandPhoto = document.getElementById('band-photo');
  if (bandPhoto && settings.band_photo_url) {
    bandPhoto.src = settings.band_photo_url;
  }
}

async function loadPageBackground(page) {
  const { data, error } = await supabaseCommon
    .from('page_backgrounds')
    .select('image_url')
    .eq('page', page)
    .maybeSingle();

  if (error) {
    console.error('Napaka pri nalaganju ozadja strani:', error);
    return null;
  }
  return data ? data.image_url : null;
}

async function initPageBackground() {
  const page = document.body.dataset.page;
  const target = document.querySelector('.page-banner') || document.querySelector('.hero');
  if (!page || !target) return;

  const imageUrl = await loadPageBackground(page);
  if (imageUrl) {
    target.style.backgroundImage = `url('${imageUrl}')`;
  }
}

// -----------------------------
// Rock zanimivost dneva (samodejno, iz Wikipedije - "on this day")
// -----------------------------
function truncateText(text, maxLen) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return { text: clean, truncated: false };
  const cut = clean.slice(0, maxLen);
  return { text: cut.slice(0, cut.lastIndexOf(' ')), truncated: true };
}

async function translateToSlovenian(text) {
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|sl`);
    if (!res.ok) return text;
    const data = await res.json();
    return (data.responseData && data.responseData.translatedText) || text;
  } catch (err) {
    console.error('Napaka pri prevajanju:', err);
    return text;
  }
}

async function loadRockFact() {
  const container = document.getElementById('rock-fact');
  if (!container) return;

  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const cacheKey = `rockFact-${today.getFullYear()}-${mm}-${dd}`;

  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    container.innerHTML = cached;
    return;
  }

  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/births/${mm}/${dd}`);
    if (!res.ok) return;
    const data = await res.json();
    const births = data.births || [];

    const descOf = (entry) => (entry.pages && entry.pages[0] && entry.pages[0].description) || '';

    const rockMatch = births.find(e => /rock/i.test(descOf(e)));
    const musicMatch = births.find(e => /music|singer|guitar|drum|bass|song|band|vocal|composer/i.test(descOf(e)));
    const match = rockMatch || musicMatch;
    if (!match) return;

    const page = match.pages && match.pages[0];
    const name = (match.text || '').split(',')[0].trim();
    const desc = descOf(match).replace(/\s*\(born \d{4}\)\s*$/i, '').replace(/\s*\(\d{4}–\d{4}\)\s*$/i, '');
    const url = page && page.content_urls && page.content_urls.desktop && page.content_urls.desktop.page;
    const dateLabel = today.toLocaleDateString('sl-SI', { day: 'numeric', month: 'long' });

    // Poskusi dobiti daljši opis (omeni bend/skupino, v kateri je oseba igrala) iz Wikipedia povzetka.
    // Najprej poskusi v slovenščini (če slovenski članek obstaja); če ne, angleškega prevedemo.
    let bandInfo = desc;
    let bandInfoIsSlovenian = false;
    let sourceUrl = url;
    const pageTitle = page && page.titles && page.titles.canonical;
    if (pageTitle) {
      let slTitle = null;
      try {
        const llRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${pageTitle}&prop=langlinks&lllang=sl&format=json&origin=*`);
        if (llRes.ok) {
          const llData = await llRes.json();
          const pages = llData.query && llData.query.pages;
          const firstPage = pages && Object.values(pages)[0];
          const langlink = firstPage && firstPage.langlinks && firstPage.langlinks[0];
          if (langlink) slTitle = langlink['*'];
        }
      } catch (llErr) {
        console.error('Napaka pri iskanju slovenskega članka:', llErr);
      }

      try {
        const sumUrl = slTitle
          ? `https://sl.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slTitle)}`
          : `https://en.wikipedia.org/api/rest_v1/page/summary/${pageTitle}`;
        const sumRes = await fetch(sumUrl);
        if (sumRes.ok) {
          const summary = await sumRes.json();
          if (summary.extract) {
            bandInfo = summary.extract.replace(/\s+/g, ' ').trim().slice(0, 450);
            bandInfoIsSlovenian = !!slTitle;
            if (slTitle) {
              sourceUrl = `https://sl.wikipedia.org/wiki/${encodeURIComponent(slTitle.replace(/ /g, '_'))}`;
            }
          }
        }
      } catch (sumErr) {
        console.error('Napaka pri nalaganju opisa benda:', sumErr);
      }
    }

    // Če opis ni že v slovenščini (ni bilo slovenskega članka), ga samodejno prevedemo.
    // Izvirno (neprevedeno oz. polno) besedilo ostane dosegljivo prek povezave na tri pikice.
    if (!bandInfoIsSlovenian && bandInfo) {
      bandInfo = await translateToSlovenian(bandInfo);
    }
    const { text: bandInfoText, truncated } = truncateText(bandInfo, 220);
    const ellipsis = truncated
      ? (sourceUrl ? `<a href="${sourceUrl}" target="_blank" rel="noopener" title="Odpri izvirni zapis">…</a>` : '…')
      : '';

    const html = `🎸 Na današnji dan (${dateLabel}) leta ${match.year} se je rodil/a ${url ? `<a href="${url}" target="_blank" rel="noopener">${name}</a>` : name}${bandInfoText ? ' – ' + bandInfoText + ellipsis : ''}.`;

    sessionStorage.setItem(cacheKey, html);
    container.innerHTML = html;
  } catch (err) {
    console.error('Napaka pri nalaganju rock zanimivosti:', err);
  }
}

async function initCommon() {
  const links = await loadLinks();
  renderHeaderSocials(links);
  renderFooterLinks(links);
  renderPovezaveList(links);

  if (document.getElementById('gallery-list')) {
    const images = await loadGallery();
    renderGallery(images);
  }

  if (document.getElementById('hero-tagline') || document.getElementById('about-text') || document.getElementById('members-list')) {
    const settings = await loadSettings();
    renderSettings(settings);
  }

  loadRockFact();
  initPageBackground();
}

initCommon();
