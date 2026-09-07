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
                <audio controls>
                    <source src="${posnetek.file_url}" type="audio/mpeg">
                </audio>
            </div>
        `).join('');

        block.innerHTML += `
            <article>
                <h2>${albumName}</h2>
                ${albumImages[albumName] ? `<img src="${albumImages[albumName]}" alt="${albumName}" class="album-cover">` : ''}
                ${tracksHtml}
            </article>
        `;
    }

    // -----------------------------
    //  VIDEO – poenoten prikaz
    // -----------------------------
    data.forEach(posnetek => {
        if (posnetek.type !== "video") return;

        // YouTube
        if (posnetek.file_url.includes("youtube.com") || posnetek.file_url.includes("youtu.be")) {
            const embedUrl = toYouTubeEmbed(posnetek.file_url);

            videoDiv.innerHTML += `
                <article>
                    <h3>${posnetek.naslov}</h3>
                    <p>${posnetek.opis}</p>
                    <div class="video-wrapper">
                        <iframe
                            src="${embedUrl}"
                            frameborder="0"
                            allowfullscreen>
                        </iframe>
                    </div>
                </article>
            `;
        }

        // Supabase video datoteka
        else {
            videoDiv.innerHTML += `
                <article>
                    <h3>${posnetek.naslov}</h3>
                    <p>${posnetek.opis}</p>
                    <div class="video-wrapper">
                        <video controls>
                            <source src="${posnetek.file_url}" type="video/mp4">
                        </video>
                    </div>
                </article>
            `;
        }
    });
}

// Zaženi samo na posnetki.html
if (document.getElementById("audio-posnetki")) {
    loadPosnetki();
}
