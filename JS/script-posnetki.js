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

    const { data: albumOrderData } = await supabase1
        .from('albums')
        .select('*');

    const albumOrder = {};
    (albumOrderData || []).forEach(a => { albumOrder[a.name] = a.sort_order; });

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
