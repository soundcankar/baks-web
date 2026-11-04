// Povezava na Supabase
const supabase1 = supabase.createClient(
  'https://heltbjqwskckqifznlml.supabase.co',
  'sb_publishable_vEHhXtkpJq8ndMFvXGK0zg_ok4i8Kqn'
);

// Pretvorba YouTube URL → embed URL
function toYouTubeEmbed(url) {
    if (url.includes("watch?v=")) {
        const id = url.split("watch?v=")[1];
        return `https://www.youtube.com/embed/${id}`;
    }

    if (url.includes("youtu.be/")) {
        const id = url.split("youtu.be/")[1];
        return `https://www.youtube.com/embed/${id}`;
    }

    return url;
}

// Anonimno štetje predvajanj (samo pesem + čas, brez identitete)
function logTrackPlay(track, source) {
    supabase1
        .from('track_plays')
        .insert({ naslov: track.naslov, album: track.album || null, source })
        .then(({ error }) => { if (error) console.error('Napaka pri beleženju predvajanja:', error); });
}

// -----------------------------
// RADIO – naključno predvajanje vseh audio posnetkov
// -----------------------------
function initRadio(allTracks) {
    const audioTracks = (allTracks || []).filter(p => p.type === 'audio' && p.file_url);
    const player = document.getElementById('radio-player');
    if (!player || audioTracks.length === 0) return;

    // Fisher-Yates premešanje
    const queue = [...audioTracks];
    for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
    }

    let index = 0;
    const audioEl = new Audio();
    audioEl.volume = 0.8;

    const playBtn = document.getElementById('radio-play-btn');
    const titleEl = document.getElementById('radio-track-title');
    const albumEl = document.getElementById('radio-track-album');
    const volumeEl = document.getElementById('radio-volume');

    function loadTrack(i) {
        const track = queue[i];
        audioEl.src = track.file_url;
        titleEl.textContent = track.naslov;
        albumEl.textContent = track.album ? `· ${track.album}` : '';
    }

    function playNext() {
        index = (index + 1) % queue.length;
        loadTrack(index);
        audioEl.play();
    }

    audioEl.addEventListener('ended', playNext);
    audioEl.addEventListener('play', () => {
        playBtn.textContent = '⏸ ';
        player.classList.add('radio-playing');
        // Štejemo samo začetek pesmi, ne nadaljevanja po premoru
        if (audioEl.currentTime < 1) logTrackPlay(queue[index], 'radio');
    });
    audioEl.addEventListener('pause', () => {
        playBtn.textContent = '▶ ';
        player.classList.remove('radio-playing');
    });

    playBtn.addEventListener('click', () => {
        if (audioEl.paused) {
            audioEl.play();
        } else {
            audioEl.pause();
        }
    });

    volumeEl.addEventListener('input', () => {
        audioEl.volume = volumeEl.value / 100;
    });

    loadTrack(index);
    player.hidden = false;
}

// Glavna funkcija za nalaganje posnetkov
async function loadPosnetki() {
    const { data, error } = await supabase1
        .from('posnetki')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Napaka pri nalaganju posnetkov:", error);
        return;
    }

    initRadio(data);

    const { data: albumOrderData } = await supabase1
        .from('albums')
        .select('*');

    const albumOrder = {};
    const albumImages = {};
    (albumOrderData || []).forEach(a => {
        albumOrder[a.name] = a.sort_order;
        albumImages[a.name] = a.image_url;
    });

    const audioDiv = document.getElementById("audio-posnetki");
    const videoDiv = document.getElementById("video-posnetki");

    // -----------------------------
    //  AUDIO – razvrščanje po albumih
    // -----------------------------
    const albums = {};

    data.forEach(posnetek => {
        if (posnetek.type === "audio") {
            if (!albums[posnetek.album]) {
                albums[posnetek.album] = [];
            }
            albums[posnetek.album].push(posnetek);
        }
    });

    const orderedAlbumNames = Object.keys(albums).sort((a, b) => {
        const orderA = albumOrder[a] ?? 999999;
        const orderB = albumOrder[b] ?? 999999;
        return orderA - orderB;
    });

    Object.values(albums).forEach(tracks => {
        tracks.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    });

    // Prikaz albumov – vse pesmi istega albuma v enem okvirju
    audioDiv.innerHTML += '<div class="album-block"></div>';
    const block = audioDiv.querySelector(".album-block");

    for (const albumName of orderedAlbumNames) {
        const tracksHtml = albums[albumName].map(posnetek => `
            <div class="audio-row">
                <div class="audio-info">
                    <h3>${posnetek.naslov}</h3>
                    <p>${posnetek.opis}</p>
                </div>
                <audio controls data-track-id="${posnetek.id}">
                    <source src="${posnetek.file_url}" type="audio/mpeg">
                </audio>
            </div>
        `).join('');

        block.innerHTML += `
            <article>
                <details class="album-acc">
                    <summary>
                        <span class="album-acc-name">${albumName}</span>
                        <span class="album-acc-count">${albums[albumName].length}</span>
                    </summary>
                    <div class="album-acc-body">
                        ${albumImages[albumName] ? `<img src="${albumImages[albumName]}" alt="${albumName}" class="album-cover">` : ''}
                        ${tracksHtml}
                    </div>
                </details>
            </article>
        `;
    }

    // Štetje predvajanj (blok.innerHTML += zgoraj ponovno zgradi elemente, zato poslušalce dodamo šele zdaj)
    const tracksById = new Map(data.map(p => [String(p.id), p]));
    block.querySelectorAll('audio[data-track-id]').forEach(el => {
        el.addEventListener('play', () => {
            // Štejemo samo začetek pesmi, ne nadaljevanja po premoru
            if (el.currentTime < 1) logTrackPlay(tracksById.get(el.dataset.trackId), 'seznam');
        });
    });

    // -----------------------------
    //  VIDEO – poenoten prikaz
    // -----------------------------
    // Videi po albumih (kategorijah). Videi brez albuma gredo v "Razno".
    const videoAlbums = {};
    data.filter(p => p.type === "video").forEach(posnetek => {
        const name = (posnetek.album || '').trim() || 'Razno';
        if (!videoAlbums[name]) videoAlbums[name] = [];
        videoAlbums[name].push(posnetek);
    });

    // Vrstni red albumov kot v adminu; znotraj albuma po sort_order
    // (data je že po created_at padajoče, sort je stabilen).
    const orderedVideoAlbums = Object.keys(videoAlbums).sort((a, b) =>
        (albumOrder[a] ?? 999999) - (albumOrder[b] ?? 999999));

    const videoHtml = posnetek => {
        // YouTube
        if (posnetek.file_url.includes("youtube.com") || posnetek.file_url.includes("youtu.be")) {
            const embedUrl = toYouTubeEmbed(posnetek.file_url);
            return `
                <article>
                    <h3>${posnetek.naslov}</h3>
                    <p>${posnetek.opis}</p>
                    <div class="video-wrapper">
                        <iframe
                            data-src="${embedUrl}"
                            frameborder="0"
                            allowfullscreen>
                        </iframe>
                    </div>
                </article>
            `;
        }

        // Video datoteka
        return `
            <article>
                <h3>${posnetek.naslov}</h3>
                <p>${posnetek.opis}</p>
                <div class="video-wrapper">
                    <video controls preload="none">
                        <source src="${posnetek.file_url}" type="video/mp4">
                    </video>
                </div>
            </article>
        `;
    };

    orderedVideoAlbums.forEach(albumName => {
        const videos = videoAlbums[albumName]
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        videoDiv.innerHTML += `
            <details class="album-acc video-album">
                <summary>
                    <span class="album-acc-name">${albumName}</span>
                    <span class="album-acc-count">${videos.length}</span>
                </summary>
                <div class="album-acc-body">
                    ${videos.map(videoHtml).join('')}
                </div>
            </details>
        `;
    });

    initAccordions();
}

// Naenkrat je odprt samo en album v posamezni skupini; YouTube se naloži šele ob odprtju.
function initAccordions() {
    document.querySelectorAll('#panel-audio, #panel-video').forEach(panel => {
        const items = panel.querySelectorAll('details.album-acc');
        items.forEach(d => {
            d.addEventListener('toggle', () => {
                if (!d.open) return;
                items.forEach(o => { if (o !== d) o.open = false; });
                d.querySelectorAll('iframe[data-src]').forEach(f => {
                    f.src = f.dataset.src;
                    f.removeAttribute('data-src');
                });
            });
        });
    });
}

// Zavihka Avdio / Video (zapomni si izbiro, deluje tudi #video v povezavi)
function initMediaTabs() {
    const tabs = document.querySelectorAll('.media-tab');
    if (tabs.length === 0) return;

    function show(name) {
        tabs.forEach(t => {
            const on = t.dataset.tab === name;
            t.classList.toggle('active', on);
            t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        document.getElementById('panel-audio').hidden = name !== 'audio';
        document.getElementById('panel-video').hidden = name !== 'video';
        try { localStorage.setItem('posnetkiTab', name); } catch (e) {}
    }

    tabs.forEach(t => t.addEventListener('click', () => {
        show(t.dataset.tab);
        history.replaceState(null, '', '#' + t.dataset.tab);
    }));

    let initial = 'audio';
    const hash = location.hash.replace('#', '');
    if (hash === 'video' || hash === 'audio') {
        initial = hash;
    } else {
        try { initial = localStorage.getItem('posnetkiTab') === 'video' ? 'video' : 'audio'; } catch (e) {}
    }
    show(initial);
}

initMediaTabs();

// Zaženi samo na posnetki.html
if (document.getElementById("audio-posnetki")) {
    loadPosnetki();
}
