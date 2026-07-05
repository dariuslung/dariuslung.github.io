/**
 * Instagram Follower Analyzer
 * 100% Client-Side Browser Tool
 */

(function () {
    'use strict';

    // --- DOM Elements ---
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const fileStatus = document.getElementById('file-status');
    const fileStatusText = document.getElementById('file-status-text');
    const fileStatusBadge = document.getElementById('file-status-badge');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    const uploadSection = document.getElementById('upload-section');
    const resultsSection = document.getElementById('results-section');

    // KPI Elements
    const kpiFollowers = document.getElementById('kpi-followers');
    const kpiFollowing = document.getElementById('kpi-following');
    const kpiDontFollowYou = document.getElementById('kpi-dont-follow-you');
    const kpiYouDontFollow = document.getElementById('kpi-you-dont-follow');
    const kpiMutuals = document.getElementById('kpi-mutuals');

    // Tab buttons & counts
    const categoryTabs = document.getElementById('category-tabs');
    const countTabDontFollowYou = document.getElementById('count-tab-dont-follow-you');
    const countTabYouDontFollow = document.getElementById('count-tab-you-dont-follow');
    const countTabMutuals = document.getElementById('count-tab-mutuals');
    const countTabFollowers = document.getElementById('count-tab-followers');
    const countTabFollowing = document.getElementById('count-tab-following');

    // Controls
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const copyAllBtn = document.getElementById('copy-all-btn');
    const copyAllText = document.getElementById('copy-all-text');
    const resetBtn = document.getElementById('reset-btn');
    const copyToast = document.getElementById('copy-toast');

    // List & Pagination
    const userList = document.getElementById('user-list');
    const emptyState = document.getElementById('empty-state');
    const listCounter = document.getElementById('list-counter');
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageIndicator = document.getElementById('page-indicator');

    // --- State ---
    let followersData = []; // [{ username, href, timestamp }]
    let followingData = []; // [{ username, href, timestamp }]

    let calculatedLists = {
        'dont-follow-you': [],
        'you-dont-follow': [],
        'mutuals': [],
        'followers': [],
        'following': []
    };

    let state = {
        activeTab: 'dont-follow-you',
        searchQuery: '',
        sortBy: 'name-asc',
        currentPage: 1,
        itemsPerPage: 50
    };

    // --- Helpers ---
    function showError(msg) {
        errorMessage.textContent = msg;
        errorContainer.classList.remove('hidden');
    }

    function clearError() {
        errorContainer.classList.add('hidden');
        errorMessage.textContent = '';
    }

    function formatTimestamp(ts) {
        if (!ts) return null;
        try {
            // ts could be in seconds or milliseconds
            const date = new Date(ts > 1e11 ? ts : ts * 1000);
            if (isNaN(date.getTime())) return null;
            return date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return null;
        }
    }

    function extractUsernameFromHref(href) {
        if (!href) return '';
        try {
            const url = new URL(href);
            const pathParts = url.pathname.split('/').filter(Boolean);
            if (pathParts.length > 0) {
                if (pathParts[0] === '_u' && pathParts.length > 1) {
                    return pathParts[1];
                }
                if (pathParts[0] !== 'direct' && pathParts[0] !== 'explore') {
                    return pathParts[0];
                }
            }
        } catch (e) {
            const match = href.match(/instagram\.com\/(?:_u\/)?([a-zA-Z0-9_.]+)/);
            if (match && match[1]) return match[1];
        }
        return '';
    }

    // Parse Instagram export JSON objects
    function parseInstagramJson(jsonObj) {
        const users = [];
        const seen = new Set();

        function addUser(username, href, timestamp) {
            if (!username) return;
            const cleanName = username.trim();
            if (!cleanName) return;
            const lowerKey = cleanName.toLowerCase();
            if (!seen.has(lowerKey)) {
                seen.add(lowerKey);
                
                // Clean up href if it contains _u/ or is missing
                let cleanHref = href;
                if (!cleanHref || cleanHref.includes('/_u/')) {
                    cleanHref = `https://www.instagram.com/${cleanName}/`;
                }

                users.push({
                    username: cleanName,
                    href: cleanHref,
                    timestamp: timestamp || null
                });
            }
        }

        function processEntry(item) {
            if (!item) return;

            // Direct object entry with string_list_data
            if (Array.isArray(item.string_list_data) && item.string_list_data.length > 0) {
                const sub = item.string_list_data[0];
                const extracted = extractUsernameFromHref(sub.href);
                let uname = sub.value || (item.title && item.title.trim() !== '' ? item.title : '') || extracted;
                addUser(uname, sub.href, sub.timestamp);
                return;
            }

            // Simple value object
            if (item.value) {
                addUser(item.value, item.href, item.timestamp);
                return;
            }

            // Object with title
            if (item.title) {
                addUser(item.title, item.href, item.timestamp);
                return;
            }
        }

        let targetArray = null;

        if (Array.isArray(jsonObj)) {
            targetArray = jsonObj;
        } else if (typeof jsonObj === 'object' && jsonObj !== null) {
            // Check known Instagram top-level keys
            targetArray = jsonObj.relationships_followers ||
                jsonObj.relationships_following ||
                jsonObj.relationships_feed_following ||
                jsonObj.followers ||
                jsonObj.following ||
                null;

            // If not found in known keys, check any top-level key containing an array
            if (!targetArray) {
                for (const key of Object.keys(jsonObj)) {
                    if (Array.isArray(jsonObj[key])) {
                        targetArray = jsonObj[key];
                        break;
                    }
                }
            }
        }

        if (Array.isArray(targetArray)) {
            targetArray.forEach(processEntry);
        }

        return users;
    }

    // --- File Input Handlers ---

    async function handleFiles(files) {
        clearError();

        if (!files || files.length === 0) return;

        let hasZip = false;
        let jsonFiles = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.name.toLowerCase().endsWith('.zip')) {
                hasZip = true;
                await processZip(file);
                return;
            } else if (file.name.toLowerCase().endsWith('.json')) {
                jsonFiles.push(file);
            }
        }

        if (jsonFiles.length > 0) {
            await processJsonFiles(jsonFiles);
        } else if (!hasZip) {
            showError('Please select a valid .zip file or .json files from Instagram.');
        }
    }

    async function processZip(zipFile) {
        if (typeof JSZip === 'undefined') {
            showError('JSZip library failed to load. Please check your internet connection and refresh.');
            return;
        }

        try {
            fileStatus.classList.remove('hidden');
            fileStatusText.textContent = `Extracting ${zipFile.name}...`;
            fileStatusBadge.textContent = 'Processing';
            fileStatusBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';

            const zip = await JSZip.loadAsync(zipFile);
            let extractedFollowers = [];
            let extractedFollowing = [];

            const followerFilePromises = [];
            const followingFilePromises = [];

            zip.forEach((relativePath, zipEntry) => {
                if (zipEntry.dir) return;

                // Extract filename only to avoid directory names (e.g. followers_and_following) matching incorrect rules
                const pathParts = relativePath.split('/');
                const fileName = pathParts[pathParts.length - 1].toLowerCase();

                if (!fileName.endsWith('.json')) return;

                // Match followers JSON files (e.g., followers_1.json, followers.json)
                if (fileName.startsWith('followers_') || fileName === 'followers.json') {
                    followerFilePromises.push(zipEntry.async('text'));
                }
                // Match following JSON files (e.g., following.json, following_1.json)
                else if (fileName.startsWith('following') || fileName === 'following.json') {
                    followingFilePromises.push(zipEntry.async('text'));
                }
            });

            if (followerFilePromises.length === 0 && followingFilePromises.length === 0) {
                showError('Could not find followers or following JSON files inside the ZIP. Make sure you selected JSON format when downloading your Instagram export.');
                fileStatus.classList.add('hidden');
                return;
            }

            // Extract and parse follower files
            const followerTexts = await Promise.all(followerFilePromises);
            for (const text of followerTexts) {
                try {
                    const json = JSON.parse(text);
                    const parsed = parseInstagramJson(json);
                    extractedFollowers.push(...parsed);
                } catch (e) {
                    console.warn('Error parsing follower JSON inside zip:', e);
                }
            }

            // Extract and parse following files
            const followingTexts = await Promise.all(followingFilePromises);
            for (const text of followingTexts) {
                try {
                    const json = JSON.parse(text);
                    const parsed = parseInstagramJson(json);
                    extractedFollowing.push(...parsed);
                } catch (e) {
                    console.warn('Error parsing following JSON inside zip:', e);
                }
            }

            if (extractedFollowers.length === 0 && extractedFollowing.length === 0) {
                showError('Could not parse any accounts from the files in the ZIP archive.');
                fileStatus.classList.add('hidden');
                return;
            }

            followersData = extractedFollowers;
            followingData = extractedFollowing;

            finishProcessing();

        } catch (err) {
            console.error(err);
            showError('Failed to read ZIP archive: ' + (err.message || 'Corrupted file'));
            fileStatus.classList.add('hidden');
        }
    }

    async function processJsonFiles(jsonFiles) {
        fileStatus.classList.remove('hidden');
        fileStatusText.textContent = `Reading ${jsonFiles.length} JSON file(s)...`;
        fileStatusBadge.textContent = 'Processing';
        fileStatusBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';

        let newFollowers = [];
        let newFollowing = [];

        for (const file of jsonFiles) {
            try {
                const text = await file.text();
                const json = JSON.parse(text);
                const parsed = parseInstagramJson(json);

                const fileNameLower = file.name.toLowerCase();
                if (fileNameLower.includes('follower')) {
                    newFollowers.push(...parsed);
                } else if (fileNameLower.includes('following')) {
                    newFollowing.push(...parsed);
                } else {
                    // Ambiguous file name, try to deduce from top-level key or content
                    if (json && (json.relationships_followers || json.followers)) {
                        newFollowers.push(...parsed);
                    } else if (json && (json.relationships_following || json.following)) {
                        newFollowing.push(...parsed);
                    } else {
                        if (followersData.length === 0 && newFollowers.length === 0) {
                            newFollowers.push(...parsed);
                        } else {
                            newFollowing.push(...parsed);
                        }
                    }
                }
            } catch (err) {
                showError(`Failed to parse ${file.name}: ${err.message}`);
                fileStatus.classList.add('hidden');
                return;
            }
        }

        if (newFollowers.length > 0) followersData = newFollowers;
        if (newFollowing.length > 0) followingData = newFollowing;

        finishProcessing();
    }

    function finishProcessing() {
        calculateCategories();

        fileStatusText.textContent = `Loaded ${followersData.length} followers & ${followingData.length} following accounts.`;
        fileStatusBadge.textContent = 'Ready';
        fileStatusBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';

        resultsSection.classList.remove('hidden');
        renderUI();

        // Smooth scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // --- Calculations ---

    function calculateCategories() {
        const followersMap = new Map();
        followersData.forEach(item => followersMap.set(item.username.toLowerCase(), item));

        const followingMap = new Map();
        followingData.forEach(item => followingMap.set(item.username.toLowerCase(), item));

        // 1. Don't Follow You Back = You follow them, but they don't follow you back
        const dontFollowYou = [];
        followingData.forEach(item => {
            if (!followersMap.has(item.username.toLowerCase())) {
                dontFollowYou.push(item);
            }
        });

        // 2. You Don't Follow Back = They follow you, but you don't follow them back
        const youDontFollow = [];
        followersData.forEach(item => {
            if (!followingMap.has(item.username.toLowerCase())) {
                youDontFollow.push(item);
            }
        });

        // 3. Mutuals = Follow each other
        const mutuals = [];
        followingData.forEach(item => {
            if (followersMap.has(item.username.toLowerCase())) {
                mutuals.push(item);
            }
        });

        calculatedLists = {
            'dont-follow-you': dontFollowYou,
            'you-dont-follow': youDontFollow,
            'mutuals': mutuals,
            'followers': followersData,
            'following': followingData
        };
    }

    // --- UI Rendering ---

    function renderUI() {
        // Update KPIs
        kpiFollowers.textContent = followersData.length.toLocaleString();
        kpiFollowing.textContent = followingData.length.toLocaleString();
        kpiDontFollowYou.textContent = calculatedLists['dont-follow-you'].length.toLocaleString();
        kpiYouDontFollow.textContent = calculatedLists['you-dont-follow'].length.toLocaleString();
        kpiMutuals.textContent = calculatedLists['mutuals'].length.toLocaleString();

        // Update Tab Counts
        countTabDontFollowYou.textContent = calculatedLists['dont-follow-you'].length.toLocaleString();
        countTabYouDontFollow.textContent = calculatedLists['you-dont-follow'].length.toLocaleString();
        countTabMutuals.textContent = calculatedLists['mutuals'].length.toLocaleString();
        countTabFollowers.textContent = calculatedLists['followers'].length.toLocaleString();
        countTabFollowing.textContent = calculatedLists['following'].length.toLocaleString();

        // Render List
        renderActiveList();
    }

    function getFilteredAndSortedItems() {
        let items = calculatedLists[state.activeTab] || [];

        // Apply Search Filter
        if (state.searchQuery.trim() !== '') {
            const q = state.searchQuery.toLowerCase().trim();
            items = items.filter(item => item.username.toLowerCase().includes(q));
        }

        // Apply Sort
        items = [...items].sort((a, b) => {
            if (state.sortBy === 'name-asc') {
                return a.username.localeCompare(b.username, undefined, { sensitivity: 'base' });
            } else if (state.sortBy === 'name-desc') {
                return b.username.localeCompare(a.username, undefined, { sensitivity: 'base' });
            } else if (state.sortBy === 'date-desc') {
                return (b.timestamp || 0) - (a.timestamp || 0);
            } else if (state.sortBy === 'date-asc') {
                return (a.timestamp || 0) - (b.timestamp || 0);
            }
            return 0;
        });

        return items;
    }

    function renderActiveList() {
        const filtered = getFilteredAndSortedItems();
        const totalItems = filtered.length;

        // Pagination calculations
        const totalPages = Math.max(1, Math.ceil(totalItems / state.itemsPerPage));
        if (state.currentPage > totalPages) state.currentPage = totalPages;

        const startIndex = (state.currentPage - 1) * state.itemsPerPage;
        const pageItems = filtered.slice(startIndex, startIndex + state.itemsPerPage);

        // Update counter text
        if (totalItems === 0) {
            listCounter.textContent = 'Showing 0 accounts';
            emptyState.classList.remove('hidden');
            userList.innerHTML = '';
        } else {
            emptyState.classList.add('hidden');
            const endDisplay = Math.min(startIndex + state.itemsPerPage, totalItems);
            listCounter.textContent = `Showing ${startIndex + 1}-${endDisplay} of ${totalItems.toLocaleString()} accounts`;

            // Render items
            userList.innerHTML = pageItems.map(item => createUserCardHTML(item)).join('');
        }

        // Update pagination controls
        pageIndicator.textContent = `Page ${state.currentPage} of ${totalPages}`;
        prevPageBtn.disabled = state.currentPage <= 1;
        nextPageBtn.disabled = state.currentPage >= totalPages;

        // Attach event listeners for copy buttons inside items
        userList.querySelectorAll('.copy-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const uname = btn.getAttribute('data-username');
                copyToClipboard(uname);
                const originalSvg = btn.innerHTML;
                btn.innerHTML = `<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
                setTimeout(() => { btn.innerHTML = originalSvg; }, 1500);
            });
        });
    }

    function createUserCardHTML(item) {
        const dateStr = formatTimestamp(item.timestamp);
        const initial = item.username.charAt(0).toUpperCase();

        // Badge styling based on active tab
        let badgeHTML = '';
        if (state.activeTab === 'dont-follow-you') {
            badgeHTML = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Doesn't follow you</span>`;
        } else if (state.activeTab === 'you-dont-follow') {
            badgeHTML = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">You don't follow</span>`;
        } else if (state.activeTab === 'mutuals') {
            badgeHTML = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Mutual follow</span>`;
        }

        return `
            <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200/80 dark:border-gray-700/80 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-colors group">
                <div class="flex items-center gap-3 min-w-0">
                    <!-- Avatar circle -->
                    <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                        ${initial}
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <a href="${item.href}" target="_blank" rel="noopener noreferrer" class="font-semibold text-sm text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 truncate flex items-center gap-1">
                                @${item.username}
                                <svg class="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                            </a>
                            ${badgeHTML}
                        </div>
                        ${dateStr ? `<div class="text-[11px] text-gray-500 dark:text-gray-400 truncate">Added: ${dateStr}</div>` : ''}
                    </div>
                </div>

                <button data-username="${item.username}" class="copy-user-btn p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors shrink-0" title="Copy username">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                </button>
            </div>
        `;
    }

    // --- Clipboard Utility ---

    function copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text);
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            try {
                document.execCommand('copy');
            } catch (err) {
                console.error('Fallback copy failed', err);
            }
            document.body.removeChild(textarea);
        }
    }

    function showToast() {
        copyToast.classList.remove('hidden');
        setTimeout(() => { copyToast.classList.add('hidden'); }, 2000);
    }

    // --- Event Listeners Setup ---

    function setupEventListeners() {
        // Drag and Drop
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-900/20');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-900/20');
            }, false);
        });

        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files.length > 0) {
                handleFiles(dt.files);
            }
        });

        dropzone.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFiles(e.target.files);
            }
        });

        // Tabs
        categoryTabs.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.tab-btn');
            if (!tabBtn) return;

            const targetTab = tabBtn.getAttribute('data-tab');
            if (targetTab === state.activeTab) return;

            state.activeTab = targetTab;
            state.currentPage = 1;

            // Update tab styles
            categoryTabs.querySelectorAll('.tab-btn').forEach(btn => {
                const btnTab = btn.getAttribute('data-tab');
                if (btnTab === state.activeTab) {
                    if (btnTab === 'dont-follow-you') {
                        btn.className = 'tab-btn px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
                    } else if (btnTab === 'you-dont-follow') {
                        btn.className = 'tab-btn px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
                    } else if (btnTab === 'mutuals') {
                        btn.className = 'tab-btn px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
                    } else {
                        btn.className = 'tab-btn px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100';
                    }
                } else {
                    btn.className = 'tab-btn px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50';
                }
            });

            renderActiveList();
        });

        // Search Input
        searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value;
            state.currentPage = 1;
            renderActiveList();
        });

        // Sort Select
        sortSelect.addEventListener('change', (e) => {
            state.sortBy = e.target.value;
            state.currentPage = 1;
            renderActiveList();
        });

        // Copy All List
        copyAllBtn.addEventListener('click', () => {
            const items = getFilteredAndSortedItems();
            if (items.length === 0) return;

            const textList = items.map(item => item.username).join('\n');
            copyToClipboard(textList);

            copyAllText.textContent = 'Copied!';
            showToast();
            setTimeout(() => { copyAllText.textContent = 'Copy List'; }, 2000);
        });

        // Reset Button
        resetBtn.addEventListener('click', () => {
            followersData = [];
            followingData = [];
            calculatedLists = {
                'dont-follow-you': [],
                'you-dont-follow': [],
                'mutuals': [],
                'followers': [],
                'following': []
            };
            state.searchQuery = '';
            searchInput.value = '';
            fileInput.value = '';
            fileStatus.classList.add('hidden');
            resultsSection.classList.add('hidden');
            clearError();

            uploadSection.scrollIntoView({ behavior: 'smooth' });
        });

        // Pagination Buttons
        prevPageBtn.addEventListener('click', () => {
            if (state.currentPage > 1) {
                state.currentPage--;
                renderActiveList();
            }
        });

        nextPageBtn.addEventListener('click', () => {
            const filtered = getFilteredAndSortedItems();
            const totalPages = Math.ceil(filtered.length / state.itemsPerPage);
            if (state.currentPage < totalPages) {
                state.currentPage++;
                renderActiveList();
            }
        });
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        setupEventListeners();
    });

})();
