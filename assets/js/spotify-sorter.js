// --- Configuration ---
const SPOTIFY_CLIENT_ID = "07b4020c7f424e0dac131254838bdbe0";


// --- State Management ---
let accessToken = null;
let isCancelled = false;
let cachedPlaylists = [];

// Dynamically grab the current URL to use as the redirect URI
// Ensure this URL is whitelisted in your Spotify Developer Dashboard!
const REDIRECT_URI = window.location.origin + window.location.pathname;


// --- DOM Elements ---
const secLogin = document.getElementById('section-login');
const secPlaylists = document.getElementById('section-playlists');
const secProgress = document.getElementById('section-progress');

// --- Utility: Sleep for Rate Limiting (Crucial for MusicBrainz) ---
const sleep = ms => new Promise(r => setTimeout(r, ms));

// --- PKCE Auth Utilities ---
const generateRandomString = (length) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return Object.keys(values).reduce((acc, index) => acc + possible[values[index] % possible.length], '');
};

const sha256 = async (plain) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input) => {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
};

// --- Initialization & Auth Flow ---
window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    const storedToken = localStorage.getItem('spotify_access_token');
    const tokenExpiry = localStorage.getItem('spotify_token_expiry');
    const refreshToken = localStorage.getItem('spotify_refresh_token');

    if (code) {
        // First-time login: Exchange code for token
        const codeVerifier = localStorage.getItem('spotify_code_verifier');
        try {
            const response = await fetch("https://accounts.spotify.com/api/token", {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: SPOTIFY_CLIENT_ID,
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: REDIRECT_URI,
                    code_verifier: codeVerifier,
                })
            });
            const data = await response.json();
            
            if (data.access_token) {
                accessToken = data.access_token;
                localStorage.setItem('spotify_access_token', data.access_token);
                localStorage.setItem('spotify_refresh_token', data.refresh_token);
                localStorage.setItem('spotify_token_expiry', Date.now() + (data.expires_in * 1000));
                
                window.history.replaceState(null, null, window.location.pathname);
                showPlaylists();
            }
        } catch (e) {
            console.error("Auth error:", e);
        }
    } else if (storedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
        // Token exists and is still valid
        accessToken = storedToken;
        showPlaylists();
    } else if (refreshToken) {
        // Token expired, fetch a new one quietly behind the scenes
        try {
            const response = await fetch("https://accounts.spotify.com/api/token", {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: SPOTIFY_CLIENT_ID,
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken
                })
            });
            const data = await response.json();
            if (data.access_token) {
                accessToken = data.access_token;
                localStorage.setItem('spotify_access_token', data.access_token);
                if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
                localStorage.setItem('spotify_token_expiry', Date.now() + (data.expires_in * 1000));
                showPlaylists();
            } else {
                document.getElementById('btn-logout').click(); // Refresh failed
            }
        } catch (e) {
            console.error("Token refresh failed", e);
        }
    }
});

document.getElementById('btn-login').addEventListener('click', async () => {
    if (!SPOTIFY_CLIENT_ID || SPOTIFY_CLIENT_ID === "YOUR_CLIENT_ID_HERE") {
        return alert("Developer Error: Spotify Client ID is not configured.");
    }
    
    const codeVerifier = generateRandomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);
    
    window.localStorage.setItem('spotify_code_verifier', codeVerifier);

    const scope = 'playlist-read-private playlist-modify-private playlist-modify-public';
    const authUrl = new URL("https://accounts.spotify.com/authorize");
    
    authUrl.search = new URLSearchParams({
        response_type: 'code',
        client_id: SPOTIFY_CLIENT_ID,
        scope: scope,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        redirect_uri: REDIRECT_URI,
    }).toString();
    
    window.location.href = authUrl.toString();
});

document.getElementById('btn-logout').addEventListener('click', () => {
    accessToken = null;
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expiry');
    secPlaylists.classList.add('hidden');
    secLogin.classList.remove('hidden');
});

document.getElementById('btn-refresh').addEventListener('click', () => {
    // Simply call the existing function to re-fetch and render the playlists
    showPlaylists();
});

document.getElementById('btn-cancel').addEventListener('click', () => {
    isCancelled = true;
    updateProgressUI("Cancelled by user.", 100, true);
});

document.getElementById('btn-back').addEventListener('click', () => {
    secProgress.classList.add('hidden');
    secPlaylists.classList.remove('hidden');
});

document.getElementById('playlist-sort-select').addEventListener('change', () => {
    if (cachedPlaylists.length > 0) {
        renderPlaylists();
    }
});


// --- Spotify API Layer ---
async function fetchSpotify(endpoint, options = {}) {
    while (true) {
        const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        });
        
        // Auto-handle rate limits without crashing the sort
        if (res.status === 429) {
            const retryAfter = parseInt(res.headers.get('Retry-After') || '2', 10);
            console.warn(`Spotify Rate Limit Hit. Waiting ${retryAfter}s...`);
            await sleep((retryAfter + 1) * 1000);
            continue; 
        }
        
        if (res.status === 401) {
            alert("Session expired. Please log in again.");
            document.getElementById('btn-logout').click();
            throw new Error("Unauthorized");
        }
        
        const text = await res.text();
        return text ? JSON.parse(text) : null;
    }
}

async function showPlaylists() {
    secLogin.classList.add('hidden');
    secPlaylists.classList.remove('hidden');
    const container = document.getElementById('playlists-container');
    container.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Loading playlists...</p>';

    try {
        const data = await fetchSpotify('/me/playlists?limit=50');
        // Cache the raw data, filtering out nulls
        cachedPlaylists = data.items.filter(Boolean);
        
        // Reset the sort dropdown to default upon fresh load
        document.getElementById('playlist-sort-select').value = 'default';
        
        renderPlaylists();
    } catch (e) {
        console.error(e);
        if (e.message !== "Unauthorized") {
            container.innerHTML = '<p class="text-red-500">Failed to load playlists.</p>';
        }
    }
}

function renderPlaylists() {
    const container = document.getElementById('playlists-container');
    container.innerHTML = '';

    const sortOption = document.getElementById('playlist-sort-select').value;
    
    // Create a shallow copy to sort without mutating the original fetch order
    let listToRender = [...cachedPlaylists];

    if (sortOption === 'name-asc') {
        listToRender.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'name-desc') {
        listToRender.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortOption === 'tracks-desc') {
        listToRender.sort((a, b) => b.tracks.total - a.tracks.total);
    } else if (sortOption === 'tracks-asc') {
        listToRender.sort((a, b) => a.tracks.total - b.tracks.total);
    }

    listToRender.forEach(pl => {
        const el = document.createElement('div');
        el.className = 'flex justify-between items-center p-4 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 ';
        el.innerHTML = `
            <div>
                <div class="font-semibold text-gray-900 dark:text-gray-100">${pl.name}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">${pl.tracks.total} tracks</div>
            </div>
            <div class="flex gap-2 flex-wrap sm:flex-nowrap justify-end mt-2 sm:mt-0">
                <select class="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm rounded-md px-2 py-1 text-gray-900 dark:text-gray-100 outline-none">
                    <option value="date">Release Date</option>
                    <option value="name">Track Name</option>
                    <option value="artist">Artist Name</option>
                </select>
                <select class="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm rounded-md px-2 py-1 text-gray-900 dark:text-gray-100 outline-none">
                    <option value="asc">Asc</option>
                    <option value="desc">Desc</option>
                </select>
                <button class="btn-sort px-3 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors duration-300">
                    Sort
                </button>
            </div>
        `;
        
        const selects = el.querySelectorAll('select');
        el.querySelector('.btn-sort').addEventListener('click', () => {
            startSortProcess(pl.id, pl.name, selects[0].value, selects[1].value);
        });
        
        container.appendChild(el);
    });
}


// --- MusicBrainz & Sorting Logic ---
function updateProgressUI(statusText, percent, isComplete = false) {
    document.getElementById('progress-status').innerText = statusText;
    const bar = document.getElementById('progress-bar');
    bar.style.width = `${percent}%`;
    
    if (isComplete) {
        bar.classList.replace('bg-[#1DB954]', isCancelled ? 'bg-red-500' : 'bg-blue-500');
        document.getElementById('btn-cancel').classList.add('hidden');
        document.getElementById('btn-back').classList.remove('hidden');
    }
}

function parseDateObj(dateStr) {
    if (!dateStr) return 9999999999999; 
    try {
        return new Date(dateStr).getTime();
    } catch(e) {
        return 9999999999999;
    }
}

async function fetchMusicBrainzBatch(queryParts) {
    // 1.1s delay to respect MusicBrainz rate limit (1 per second per IP)
    await sleep(1100); 
    const query = queryParts.join(' OR ');
    const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&limit=100&fmt=json`;
    
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'SpotifySorter-ClientSide/1.0' }});
        const data = await res.json();
        return data.recordings || [];
    } catch (e) {
        console.warn("MusicBrainz fetch failed", e);
        return [];
    }
}

async function startSortProcess(playlistId, playlistName, sortBy, order) {
    isCancelled = false;
    secPlaylists.classList.add('hidden');
    secProgress.classList.remove('hidden');
    document.getElementById('btn-cancel').classList.remove('hidden');
    document.getElementById('btn-back').classList.add('hidden');
    
    const bar = document.getElementById('progress-bar');
    bar.className = 'bg-[#1DB954] h-3 rounded-full ';
    bar.style.width = '0%';
    document.getElementById('progress-title').innerText = `Sorting: ${playlistName}`;

    try {
        // 1. Fetch Tracks
        updateProgressUI("Fetching tracks from Spotify...", 10);
        let tracks = [];
        let url = `/playlists/${playlistId}/tracks`;
        while (url) {
            if (isCancelled) return;
            const data = await fetchSpotify(url.replace('https://api.spotify.com/v1', ''));
            tracks.push(...data.items);
            url = data.next;
        }

        const total = tracks.length;
        if (total === 0) return updateProgressUI("Playlist is empty.", 100, true);

        // 2. Process MusicBrainz (Only if sorting by date)
        const isrcDateMap = {};
        if (sortBy === 'date') {
            const validIsrcs = tracks.map(t => t.track?.external_ids?.isrc).filter(Boolean);
            const batchSize = 50;
            
            for (let i = 0; i < validIsrcs.length; i += batchSize) {
                if (isCancelled) return;
                updateProgressUI(`Querying MusicBrainz (${Math.min(i + batchSize, validIsrcs.length)}/${validIsrcs.length})...`, 10 + (60 * (i/validIsrcs.length)));
                
                const chunk = validIsrcs.slice(i, i + batchSize);
                const queries = chunk.map(isrc => `isrc:${isrc}`);
                
                const recordings = await fetchMusicBrainzBatch(queries);
                recordings.forEach(rec => {
                    const recDate = rec['first-release-date'];
                    if (recDate) {
                        const recIsrcs = rec.isrcs || [];
                        recIsrcs.forEach(isrcObj => {
                            if (chunk.includes(isrcObj.id) && !isrcDateMap[isrcObj.id]) {
                                isrcDateMap[isrcObj.id] = recDate;
                            }
                        });
                    }
                });
            }
        }

        if (isCancelled) return;
        updateProgressUI("Sorting local data...", 75);

        // 3. Map Data and Sort
        let currentList = tracks.map((item, index) => {
            const t = item.track;
            let sortValue = Number.MAX_SAFE_INTEGER; // Default pushes to bottom
            
            if (t && !t.is_local) {
                const isrc = t.external_ids?.isrc;
                const artist = t.artists?.[0]?.name || "";
                
                if (sortBy === 'date') {
                    const mbDate = isrcDateMap[isrc];
                    const spDate = t.album?.release_date;
                    sortValue = parseDateObj(mbDate || spDate);
                } else if (sortBy === 'name') {
                    sortValue = t.name.toLowerCase();
                } else if (sortBy === 'artist') {
                    sortValue = artist.toLowerCase();
                }
            }
            
            return { originalId: index, sortValue: sortValue };
        });

        // Determine final sorted order
        let targetList = [...currentList].sort((a, b) => {
            if (a.sortValue < b.sortValue) return order === 'asc' ? -1 : 1;
            if (a.sortValue > b.sortValue) return order === 'asc' ? 1 : -1;
            return 0;
        });

        // Algorithm to generate minimum in-place moves (Preserves "Date Added")
        let moves = [];
        let simulatedList = [...currentList];
        
        for (let i = 0; i < targetList.length; i++) {
            const targetItem = targetList[i];
            const currentIndex = simulatedList.findIndex(t => t.originalId === targetItem.originalId);
            
            if (currentIndex !== i) {
                // Spotify's insert_before math shifts if moving an item backwards vs forwards
                let insertBefore = currentIndex < i ? i + 1 : i;
                moves.push({ range_start: currentIndex, insert_before: insertBefore });
                
                // Track simulated state to accurately generate the next move
                const [movedItem] = simulatedList.splice(currentIndex, 1);
                simulatedList.splice(i, 0, movedItem);
            }
        }

        // 4. Update Spotify Playlist (Sequential Reorder)
        if (isCancelled) return;
        updateProgressUI(`Reordering playlist (0/${moves.length} moves)...`, 85);

        for (let i = 0; i < moves.length; i++) {
            if (isCancelled) return;
            
            await fetchSpotify(`/playlists/${playlistId}/tracks`, {
                method: 'PUT',
                body: JSON.stringify({
                    range_start: moves[i].range_start,
                    insert_before: moves[i].insert_before,
                    range_length: 1
                })
            });
            
            const pct = Math.round((i / moves.length) * 15);
            updateProgressUI(`Reordering playlist (${i + 1}/${moves.length} moves)...`, 85 + pct);
        }

        updateProgressUI("Complete! Check your Spotify app.", 100, true);

    } catch (e) {
        console.error(e);
        updateProgressUI("An error occurred. Check the console.", 100, true);
    }
}