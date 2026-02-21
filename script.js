/* --- CONFIGURATION --- */
        let TOTAL_CHESTS = 10;
        const COOLDOWN_DAYS = 30;
        const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
        const MASTER_RESET_KEY = "RESET-CHESTS"; 
        const ADMIN_BYPASS_KEY = "ALOK"; 
        // Special master key that unlocks all chests at once when entered into any chest input
        const UNLOCK_ALL_KEY = "OPEN-ALL";
        const RESTART_KEYWORD = "RESTART";

        const DEFAULT_CHEST_DATA = [
            { id: 1, type: "text", icon: "\ud83d\udc96", label: "Just for You", content: null },
            { id: 2, type: "wallpaper", icon: "\ud83d\udcf8", label: "A Special Image", content: null },
            { id: 3, type: "playlist", icon: "\ud83c\udfa7", label: "Songs Just for You", content: null },
            { id: 4, type: "text", icon: "\ud83d\udcdc", label: "A Poem for My Muse", content: null },
            { id: 5, type: "link", icon: "\u2753", label: "Riddle Challenge", content: null },
            { id: 6, type: "gallery", icon: "\ud83d\uddbc\ufe0f", label: "Memory Collage", content: null },
            { id: 7, type: "bonus_key", icon: "\ud83d\ude02", label: "A Chuckle & A Skip", content: null },
            { id: 8, type: "text", icon: "\ud83e\uddde", label: "Your Wish is My Command", content: null },
            { id: 9, type: "gallery", icon: "\ud83e\udd2a", label: "A Collection of Hilarious Memes", content: null },
            { id: 10, type: "puzzle", icon: "\ud83e\udde9", label: "The Grand Finale Puzzle", content: null }
        ];
        /* --- STATE --- */
        let CHEST_DATA = JSON.parse(JSON.stringify(DEFAULT_CHEST_DATA));
        const API_STATE_URL = '/api/state';
        const API_RESET_URL = '/api/reset';
        const API_AUTH_LOGIN_URL = '/api/auth/login';
        const API_AUTH_LOGOUT_URL = '/api/auth/logout';
        const API_AUTH_HEARTBEAT_URL = '/api/auth/heartbeat';
        const API_ADMIN_USERS_URL = '/api/admin/users';
        const API_ADMIN_ANALYTICS_URL = '/api/admin/analytics';
        const API_ADMIN_ANALYTICS_CSV_URL = '/api/admin/analytics/sessions.csv';
        const API_FEEDBACK_URL = '/api/feedback';
        const HEARTBEAT_INTERVAL_MS = 60000;

        function createDefaultState() {
            return {
                chests: [],
                pendingKey: null,
                lastGenerationTime: 0,
                tutorialSeen: false,
                adminHistory: [],
                puzzleState: null,
                feedbackSent: null,
                contentAccessTimes: {},
                localUpdatedAt: 0,
                ui: {
                    theme: 'dark',
                    colorScheme: 'amethyst',
                    highlight: 'amethyst',
                    customSchemeColor: '#6b2fb5',
                    customHighlightColor: '#6b2fb5'
                }
            };
        }

        function hydrateState(incoming) {
            const base = createDefaultState();
            const next = incoming && typeof incoming === 'object' ? incoming : {};
            return {
                ...base,
                ...next,
                ui: {
                    ...base.ui,
                    ...(next.ui && typeof next.ui === 'object' ? next.ui : {})
                }
            };
        }

        let state = createDefaultState();
        let saveQueue = Promise.resolve();
        let currentUser = null;
        let loginAttempts = Number(localStorage.getItem('gift_login_attempts') || 0);
        let sessionScreenMs = 0;
        let visibleSince = Date.now();
        let updateTimerInterval = null;
        let heartbeatInterval = null;
        let initBindingsApplied = false;
        const analyticsState = {
            rows: [],
            page: 1,
            pageSize: 12
        };
        let saveDebounceTimer = null;
        let pendingStateSnapshot = null;
        const SAVE_DEBOUNCE_MS = 120;
        let sharedColorPicker = null;
        let sharedColorPickerCallback = null;

        // When true, don't reveal the final feedback section yet so the last chest's gift
        // can be displayed first. This is toggled when the 10th chest is just unlocked.
        let deferFinalReveal = false;

        function setLoginStatus(text, isError = false) {
            const status = document.getElementById('login-status');
            const attempts = document.getElementById('login-attempts');
            if (status) {
                status.textContent = text || '';
                status.style.color = isError ? 'var(--danger)' : 'var(--text-muted)';
            }
            if (attempts) {
                const left = Math.max(0, 3 - loginAttempts);
                attempts.textContent = left > 0 ? `Attempts left: ${left}` : 'Retry limit reached. Refresh page to retry later.';
            }
        }

        function deepClone(obj) {
            return JSON.parse(JSON.stringify(obj));
        }

        function getStateCacheKey() {
            const userId = currentUser && currentUser.userId ? currentUser.userId : 'anonymous';
            return `gift_state_cache_${userId}`;
        }

        function writeStateCache(snapshot) {
            try {
                localStorage.setItem(getStateCacheKey(), JSON.stringify(snapshot));
            } catch (err) {
                // Ignore cache write errors.
            }
        }

        function readStateCache() {
            try {
                const raw = localStorage.getItem(getStateCacheKey());
                if (!raw) return null;
                return JSON.parse(raw);
            } catch (err) {
                return null;
            }
        }

        function clearAllStateCaches() {
            try {
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.indexOf('gift_state_cache_') === 0) keysToRemove.push(k);
                }
                keysToRemove.forEach((k) => localStorage.removeItem(k));
            } catch (err) {
                // Ignore cache clear errors.
            }
        }

        const BOOT_PROFILE_KEY = 'gift_boot_profile';

        function writeBootProfile(profile) {
            try {
                if (!profile || typeof profile !== 'object') {
                    localStorage.removeItem(BOOT_PROFILE_KEY);
                    return;
                }
                localStorage.setItem(BOOT_PROFILE_KEY, JSON.stringify(profile));
            } catch (err) {
                // Ignore storage errors.
            }
        }

        function readBootProfile() {
            try {
                const raw = localStorage.getItem(BOOT_PROFILE_KEY);
                if (!raw) return null;
                return JSON.parse(raw);
            } catch (err) {
                return null;
            }
        }

        function applyBootProfileToDom() {
            const profile = readBootProfile();
            if (!profile || typeof profile !== 'object') return;

            const h1 = document.getElementById('header-title') || document.querySelector('header h1');
            const p = document.getElementById('header-subtitle') || document.querySelector('header p');
            const favicon = document.getElementById('site-favicon');
            const tutorialTitleEl = document.getElementById('tutorial-welcome-title');
            const tutorialSubtitleEl = document.getElementById('tutorial-welcome-subtitle');
            const footerBrandTextEl = document.getElementById('footer-brand-text');

            if (typeof profile.pageTitle === 'string' && profile.pageTitle.trim()) {
                document.title = profile.pageTitle.trim();
            }
            if (h1 && typeof profile.headerTitle === 'string' && profile.headerTitle.trim()) {
                h1.textContent = profile.headerTitle.trim();
            }
            if (p && typeof profile.headerSubtitle === 'string' && profile.headerSubtitle.trim()) {
                p.textContent = profile.headerSubtitle.trim();
            }
            if (favicon && typeof profile.tabIcon === 'string' && profile.tabIcon.trim()) {
                favicon.setAttribute('href', profile.tabIcon.trim());
            }
            if (tutorialTitleEl && typeof profile.tutorialTitle === 'string' && profile.tutorialTitle.trim()) {
                tutorialTitleEl.textContent = profile.tutorialTitle.trim();
            }
            if (tutorialSubtitleEl && typeof profile.tutorialSubtitle === 'string' && profile.tutorialSubtitle.trim()) {
                tutorialSubtitleEl.textContent = profile.tutorialSubtitle.trim();
            }
            if (footerBrandTextEl && typeof profile.footerText === 'string' && profile.footerText.trim()) {
                footerBrandTextEl.textContent = profile.footerText.trim();
            }
        }

        function setAppReady() {
            document.body.classList.remove('app-loading');
        }

        function showToast(message, type = 'info', duration = 2800) {
            const text = (message || '').toString().trim();
            if (!text) return;
            let root = document.getElementById('app-toast-root');
            if (!root) {
                root = document.createElement('div');
                root.id = 'app-toast-root';
                root.className = 'app-toast-root';
                document.body.appendChild(root);
            }
            const toast = document.createElement('div');
            const kind = type === 'success' ? 'success' : (type === 'error' ? 'error' : 'info');
            toast.className = `app-toast app-toast-${kind}`;
            toast.textContent = text;
            root.appendChild(toast);
            requestAnimationFrame(() => toast.classList.add('show'));
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 220);
            }, Math.max(1200, Number(duration) || 2800));
        }

        function getAdminKeyFromUI() {
            const el = document.getElementById('admin-key-input');
            return (el && el.value ? el.value.trim() : '');
        }

        function adminAuthHeaders(base = {}) {
            const key = getAdminKeyFromUI();
            return key ? { ...base, 'x-admin-key': key } : base;
        }

        function applyUserPersonalization(user) {
            currentUser = user || null;
            CHEST_DATA = deepClone(DEFAULT_CHEST_DATA);

            const profile = (user && user.contentProfile && typeof user.contentProfile === 'object') ? user.contentProfile : {};
            const overrides = Array.isArray(profile.chestOverrides) ? profile.chestOverrides : [];
            for (const override of overrides) {
                if (!override || typeof override !== 'object') continue;
                const idx = CHEST_DATA.findIndex(c => c.id === override.id);
                if (idx >= 0) {
                    CHEST_DATA[idx] = {
                        ...CHEST_DATA[idx],
                        ...override
                    };
                }
            }

            TOTAL_CHESTS = CHEST_DATA.length;

            const h1 = document.getElementById('header-title') || document.querySelector('header h1');
            const p = document.getElementById('header-subtitle') || document.querySelector('header p');
            const favicon = document.getElementById('site-favicon');
            const tutorialTitleEl = document.getElementById('tutorial-welcome-title');
            const tutorialSubtitleEl = document.getElementById('tutorial-welcome-subtitle');
            const footerBrandTextEl = document.getElementById('footer-brand-text');
            const cached = readBootProfile() || {};
            const baseTitle = document.title || cached.pageTitle || 'Secret Chests';
            const baseHeaderTitle = h1 ? h1.textContent : baseTitle;
            const baseHeaderSubtitle = p ? p.textContent : '';
            const baseTabIcon = (favicon && favicon.getAttribute('href'))
                ? favicon.getAttribute('href')
                : (cached.tabIcon || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"%3E%3Ctext y="50" font-size="48"%3E%F0%9F%8E%81%3C/text%3E%3C/svg%3E');
            const baseTutorialTitle = tutorialTitleEl ? tutorialTitleEl.textContent : 'Welcome! \ud83d\udc96';
            const baseTutorialSubtitle = tutorialSubtitleEl ? tutorialSubtitleEl.textContent : '';
            const baseFooterText = footerBrandTextEl ? footerBrandTextEl.textContent : '';

            const title = (typeof profile.pageTitle === 'string' && profile.pageTitle.trim())
                ? profile.pageTitle.trim()
                : ((user && user.pageTitle) ? String(user.pageTitle) : baseTitle);
            const subtitle = (typeof profile.headerSubtitle === 'string' && profile.headerSubtitle.trim())
                ? profile.headerSubtitle.trim()
                : baseHeaderSubtitle;
            const headerTitle = (typeof profile.headerTitle === 'string' && profile.headerTitle.trim())
                ? profile.headerTitle.trim()
                : title;
            const tabIcon = (typeof profile.tabIcon === 'string' && profile.tabIcon.trim())
                ? profile.tabIcon.trim()
                : baseTabIcon;
            const tutorialTitle = (typeof profile.tutorialTitle === 'string' && profile.tutorialTitle.trim())
                ? profile.tutorialTitle.trim()
                : baseTutorialTitle;
            const tutorialSubtitle = (typeof profile.tutorialSubtitle === 'string' && profile.tutorialSubtitle.trim())
                ? profile.tutorialSubtitle.trim()
                : baseTutorialSubtitle;
            const footerText = (typeof profile.footerText === 'string' && profile.footerText.trim())
                ? profile.footerText.trim()
                : baseFooterText;

            document.title = title;
            if (h1) h1.textContent = headerTitle;
            if (p) p.textContent = subtitle;
            if (favicon) favicon.setAttribute('href', tabIcon);
            if (tutorialTitleEl) tutorialTitleEl.textContent = tutorialTitle;
            if (tutorialSubtitleEl) tutorialSubtitleEl.textContent = tutorialSubtitle;
            if (footerBrandTextEl) footerBrandTextEl.textContent = footerText;

            if (user) {
                writeBootProfile({
                    pageTitle: title,
                    headerTitle,
                    headerSubtitle: subtitle,
                    tabIcon,
                    tutorialTitle,
                    tutorialSubtitle,
                    footerText
                });
            }

            const userInfo = document.getElementById('user-session-info');
            const userName = document.getElementById('session-user-name');
            const logoutBtn = document.getElementById('logout-btn');
            if (userInfo && userName && user) {
                userInfo.style.display = 'block';
                userName.textContent = user.name || user.userId || 'User';
            }
            if (logoutBtn) logoutBtn.style.display = user ? 'flex' : 'none';
        }

        async function submitLogin() {
            const name = (document.getElementById('login-name').value || '').trim();
            const phone = (document.getElementById('login-phone').value || '').trim();
            if (!name || !phone) {
                setLoginStatus('Name and phone are required.', true);
                return;
            }
            setLoginStatus('Verifying...');
            try {
                const res = await fetch(API_AUTH_LOGIN_URL, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, phone })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.ok) {
                    const rawError = String(data.error || '');
                    const quotaLikeError = /quota exceeded|read requests per minute|too many requests|rate limit/i.test(rawError) || res.status === 429;
                    if (quotaLikeError) {
                        setLoginStatus('Trying to Log in too frequently...Try again after 2 minutes.', true);
                        return;
                    }

                    if (typeof data.attemptsLeft === 'number') {
                        loginAttempts = Math.max(0, 3 - data.attemptsLeft);
                    } else {
                        loginAttempts = Math.min(3, loginAttempts + 1);
                    }
                    localStorage.setItem('gift_login_attempts', String(loginAttempts));
                    setLoginStatus(data.error || 'Verification failed.', true);
                    return;
                }

                loginAttempts = 0;
                localStorage.setItem('gift_login_attempts', '0');
                applyUserPersonalization(data.user || null);
                const loginModal = document.getElementById('login-modal');
                if (loginModal) loginModal.classList.remove('active');
                await init();
            } catch (err) {
                loginAttempts = Math.min(3, loginAttempts + 1);
                localStorage.setItem('gift_login_attempts', String(loginAttempts));
                setLoginStatus('Login failed. Check network and retry.', true);
            }
        }

        function updateVisibleScreenTime() {
            const now = Date.now();
            if (document.visibilityState === 'visible' && visibleSince > 0) {
                sessionScreenMs += Math.max(0, now - visibleSince);
                visibleSince = now;
            } else if (document.visibilityState !== 'visible') {
                visibleSince = 0;
            }
        }

        async function logoutUser() {
            updateVisibleScreenTime();
            const screenTimeSec = Math.floor(sessionScreenMs / 1000);
            try {
                await fetch(API_AUTH_LOGOUT_URL, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ screenTimeSec })
                });
            } catch (err) {
                console.error('Logout failed:', err);
            }
            writeBootProfile(null);
            location.reload();
        }

        async function heartbeat() {
            if (!currentUser) return;
            updateVisibleScreenTime();
            fetch(API_AUTH_HEARTBEAT_URL, {
                method: 'POST',
                credentials: 'include'
            }).catch(() => {});
        }

        /* --- INIT --- */
        async function init() {
            const loginModal = document.getElementById('login-modal');
            if (loginModal && !currentUser) loginModal.classList.remove('active');
            initTheme();
            const ok = await loadState();
            if (!ok) return;

            const existingById = new Map((Array.isArray(state.chests) ? state.chests : []).map((c) => [Number(c.id), c]));
            state.chests = CHEST_DATA.map((c) => {
                const prev = existingById.get(Number(c.id));
                return prev ? {
                    id: c.id,
                    isLocked: prev.isLocked !== false,
                    key: prev.key || null,
                    unlockedAt: prev.unlockedAt || null,
                    bonusUsed: !!prev.bonusUsed
                } : {
                    id: c.id,
                    isLocked: true,
                    key: null,
                    unlockedAt: null,
                    bonusUsed: false
                };
            });

            if (!state.tutorialSeen) {
                document.getElementById('tutorial-modal').classList.add('active');
            }

            // Defer service worker registration and notification prompts until the page has fully loaded
            // to avoid delaying initial render.
            // Registration will occur on `window.load` (see bottom of file).
            checkKeyGeneration();
            renderChests();
            updateSidebar();
             
            if (updateTimerInterval) clearInterval(updateTimerInterval);
            updateTimerInterval = setInterval(updateTimer, 1000);
            updateTimer(); 
            
            // Setup feedback submit listeners
            const restartInput = document.getElementById('restart-input');
            if (restartInput) {
                restartInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        submitFeedbackForm();
                    }
                });
            }

            logAdmin("System initialized.");
            
            if (!initBindingsApplied) {
                window.addEventListener('resize', () => {
                    if (document.getElementById('scratch-modal').classList.contains('active')) {
                        setupCanvas();
                    }
                });

                document.addEventListener('visibilitychange', () => {
                    if (document.visibilityState === 'visible') {
                        visibleSince = Date.now();
                    } else {
                        updateVisibleScreenTime();
                        if (currentUser) saveState(true).catch(() => {});
                    }
                });

                window.addEventListener('pagehide', () => {
                    try {
                        if (!currentUser) return;
                        updateVisibleScreenTime();
                        const snapshot = JSON.parse(JSON.stringify(state));
                        snapshot.localUpdatedAt = Date.now();
                        writeStateCache(snapshot);
                        const blob = new Blob([JSON.stringify({ state: snapshot })], { type: 'application/json' });
                        if (navigator.sendBeacon) {
                            navigator.sendBeacon(API_STATE_URL, blob);
                        } else {
                            saveState(true).catch(() => {});
                        }
                    } catch (err) {
                        // Ignore unload sync errors.
                    }
                });

                document.addEventListener('click', (event) => {
                    const anchor = event.target && event.target.closest ? event.target.closest('.playlist-load') : null;
                    if (!anchor) return;
                    event.preventDefault();
                    injectPlaylistEmbed(anchor);
                });

                initBindingsApplied = true;
            }

            if (heartbeatInterval) clearInterval(heartbeatInterval);
            heartbeatInterval = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
            setAppReady();
        }
        
        /* --- FEEDBACK LOGIC --- */
        function sendFeedback(type, persist = true) {
            if (persist) {
                state.feedbackSent = {
                    type,
                    at: Date.now()
                };
                saveState();
            }

            const messageEl = document.getElementById('feedback-message');
            const likeBtn = document.getElementById('feedback-like');
            const dislikeBtn = document.getElementById('feedback-dislike');
            
            if (type === 'like') {
                messageEl.innerText = "Thank you! I'm so glad you enjoyed it! \u2764\ufe0f";
                likeBtn.classList.add('disabled');
            } else {
                messageEl.innerText = "I hear you! I'll try to do better next time. Thank you for the honest feedback. \ud83d\ude0a";
                dislikeBtn.classList.add('disabled');
            }

            likeBtn.classList.add('disabled');
            dislikeBtn.classList.add('disabled');

            logAdmin(`Feedback sent: ${type}`);
        }

        async function submitFeedbackForm() {
            const inputEl = document.getElementById('restart-input');
            const submitBtn = document.getElementById('feedback-submit-btn');
            const messageEl = document.getElementById('feedback-message');
            const rawValue = inputEl && typeof inputEl.value === 'string' ? inputEl.value.trim() : '';
            if (!rawValue) {
                if (messageEl) {
                    messageEl.innerText = 'Please enter feedback before submitting.';
                    messageEl.style.color = 'var(--danger)';
                }
                showToast('Please enter feedback before submitting.', 'error');
                return;
            }

            if (rawValue.toUpperCase() === RESTART_KEYWORD) {
                if (inputEl) inputEl.value = '';
                showToast('Restarting your experience...', 'info', 1200);
                resetStateOnServer()
                    .then((res) => {
                        if (!res.ok) throw new Error('Reset failed');
                        clearAllStateCaches();
                        location.reload();
                    })
                    .catch(() => {
                        if (messageEl) {
                            messageEl.innerText = 'Unable to reset right now. Please try again.';
                            messageEl.style.color = 'var(--danger)';
                        }
                        showToast('Unable to reset right now. Please try again.', 'error');
                    });
                return;
            }

            const reaction = (state.feedbackSent && typeof state.feedbackSent === 'object' && state.feedbackSent.type)
                ? String(state.feedbackSent.type)
                : '';

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = 'Submitting...';
            }

            try {
                const res = await fetch(API_FEEDBACK_URL, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        feedback: rawValue,
                        reaction
                    })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.ok) {
                    throw new Error(data.error || `Feedback failed: ${res.status}`);
                }

                state.feedbackSent = {
                    type: reaction || 'text',
                    message: rawValue,
                    at: Date.now()
                };
                saveState();
                if (messageEl) {
                    messageEl.innerText = 'Thank you. Your feedback has been submitted.';
                    messageEl.style.color = 'var(--accent)';
                }
                showToast('Feedback submitted successfully.', 'success');
                if (inputEl) {
                    inputEl.value = '';
                    inputEl.disabled = true;
                }
                if (submitBtn) {
                    submitBtn.innerText = 'Submitted';
                    submitBtn.disabled = true;
                }
            } catch (err) {
                if (messageEl) {
                    messageEl.innerText = err.message || 'Unable to submit feedback right now.';
                    messageEl.style.color = 'var(--danger)';
                }
                showToast(err.message || 'Unable to submit feedback right now.', 'error');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = 'Submit Feedback';
                }
            }
        }

        /* --- PUZZLE GAME LOGIC --- (Omitted for brevity, kept functional) */
        let puzzleGridSize = 4;
        let puzzleImageURL = '';
        let puzzleTiles = []; 

        function createPuzzle(config) {
            puzzleImageURL = config.imageUrl;
            puzzleGridSize = config.size || 4;
            const N = puzzleGridSize * puzzleGridSize;
            
            puzzleTiles = Array.from({length: N}, (_, i) => i);

            if (!state.puzzleState) {
                do {
                    shuffleArray(puzzleTiles);
                } while (!isSolvable(puzzleTiles));
                state.puzzleState = { tiles: puzzleTiles.slice(), 
                    isSolved: false};
                saveState();
            } else {
                puzzleTiles = state.puzzleState.tiles;
            }
            
            renderPuzzle();
        }

        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }

        function isSolvable(tiles) {
            let inversions = 0;
            const size = puzzleGridSize;
            for (let i = 0; i < size * size; i++) {
                for (let j = i + 1; j < size * size; j++) {
                    if (tiles[i] !== size * size - 1 && tiles[j] !== size * size - 1 && tiles[i] > tiles[j]) {
                        inversions++;
                    }
                }
            }
            const emptyTileIndex = tiles.indexOf(size * size - 1);
            const emptyRow = Math.floor(emptyTileIndex / size); 
            
            if (size % 2 !== 0) {
                return inversions % 2 === 0;
            } else {
                const rowFromBottom = size - emptyRow; 
                return (inversions + rowFromBottom) % 2 === 0;
            }
        }
        
        function renderPuzzle() {
            const gridContainer = document.getElementById('puzzle-grid-container');
            if (!gridContainer) return;

            gridContainer.innerHTML = '';
            const size = puzzleGridSize;
            gridContainer.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
            const tileSize = 100 / size; 

            for (let i = 0; i < size * size; i++) {
                const originalIndex = puzzleTiles[i];
                const tile = document.createElement('div');
                tile.className = 'puzzle-tile';
                tile.dataset.currentPos = i;
                tile.dataset.originalIndex = originalIndex;
                
                if (originalIndex === size * size - 1) { // Empty tile
                    tile.classList.add('empty-tile');
                } else {
                    const originalCol = originalIndex % size;
                    const originalRow = Math.floor(originalIndex / size);

                    tile.style.backgroundImage = `url('${puzzleImageURL}')`;
                    
                    // FIX: Use .toFixed(4) for background-position to ensure better floating-point precision
                    // and prevent visual seams or misalignment between tiles.
                    tile.style.backgroundPosition = 
    `${(originalCol / (size - 1)) * 100}% ${(originalRow / (size - 1)) * 100}%`;
                    tile.style.backgroundSize = `${size * 100}% ${size * 100}%`;
                    tile.onclick = () => moveTile(i);
                }
                gridContainer.appendChild(tile);
            }
            // Ensure the Done button state reflects current puzzle (enabled only when solved)
            updatePuzzleDoneButton();
        }
        
        function moveTile(currentIndex) {
            const size = puzzleGridSize;
            const emptyTileValue = size * size - 1;
            const emptyIndex = puzzleTiles.indexOf(emptyTileValue);

            const currentCol = currentIndex % size;
            const currentRow = Math.floor(currentIndex / size);
            const emptyCol = emptyIndex % size;
            const emptyRow = Math.floor(emptyIndex / size);

            const isAdjacent = 
                (Math.abs(currentRow - emptyRow) === 1 && currentCol === emptyCol) ||
                (Math.abs(currentCol - emptyCol) === 1 && currentRow === emptyRow);

            if (isAdjacent) {
                [puzzleTiles[currentIndex], puzzleTiles[emptyIndex]] = [puzzleTiles[emptyIndex], puzzleTiles[currentIndex]];
                
                state.puzzleState.tiles = puzzleTiles.slice();
                saveState();
                renderPuzzle();
                
                updatePuzzleDoneButton();
            }
        }
        
        function updatePuzzleDoneButton() {
            const btn = document.getElementById('puzzle-done-btn');
            if (!btn) return;
            
            const isSolved = puzzleTiles.every((val, index) => val === index);
            btn.disabled = !isSolved;
            
            if (isSolved) {
                btn.style.background = 'linear-gradient(45deg, var(--success), #00cc99)';
                btn.innerText = '? Complete - Click to Confirm';
            } else {
                btn.style.background = '';
                btn.innerText = 'Done';
            }
        }

        function handlePuzzleDone() {
            const isSolved = puzzleTiles.every((val, index) => val === index);
            if (!isSolved) {
                alert('? Puzzle is not yet solved. Keep trying!');
                return;
            }
            checkPuzzleWin();
        }
        
        function checkPuzzleWin() {
    const messageEl = document.getElementById('puzzle-message');
    
    // CRITICAL: Clear any stale message first
    if (messageEl) messageEl.innerText = "";
    
    // Check if the tile array is in the solved order (0, 1, 2, ..., N-1)
    const isSolved = puzzleTiles.every((val, index) => val === index);
    
    if (isSolved) {
        // Tiles ARE actually solved - show success
        // We only proceed if the state is NOT already marked as solved
        if (!state.puzzleState.isSolved) {
            
            // CRITICAL STEP: Mark as solved and save
            state.puzzleState.isSolved = true;
            saveState();

            // UI Effects: Fire confetti and show success message below puzzle
            fireConfetti();
            const tiles = document.querySelectorAll('.puzzle-tile');
            tiles.forEach(tile => tile.onclick = null);
            
            // Reveal the final piece by removing the empty class and setting image background
            const emptyTileValue = puzzleGridSize * puzzleGridSize - 1;
            const emptyTileElement = document.querySelector(`[data-original-index="${emptyTileValue}"]`);
            
            if (emptyTileElement) {
                emptyTileElement.classList.remove('empty-tile');
                
                const size = puzzleGridSize;
                const originalIndex = emptyTileValue;
                const originalCol = originalIndex % size;
                const originalRow = Math.floor(originalIndex / size);
                
                emptyTileElement.style.backgroundImage = `url('${puzzleImageURL}')`;
                emptyTileElement.style.backgroundPosition = 
                    `${(originalCol / (size - 1)) * 100}% ${(originalRow / (size - 1)) * 100}%`;
                emptyTileElement.style.backgroundSize = `${size * 100}% ${size * 100}%`;
                emptyTileElement.style.cursor = 'default';
            }
            
            // Display success message below the puzzle
            if (messageEl) {
                messageEl.style.color = 'var(--success)';
                messageEl.style.fontWeight = '700';
                messageEl.style.fontSize = '1.3rem';
                messageEl.innerText = "? Puzzle Solved! ?";
            }

            logAdmin("Puzzle solved successfully.");

            // Trigger the full UI re-render afterwards
            renderChests(); 
            
        } else {
            
            // Tiles ARE solved AND state already says solved
            const emptyTileValue = puzzleGridSize * puzzleGridSize - 1;
            const emptyTileElement = document.querySelector(`[data-original-index="${emptyTileValue}"]`);
            
            // Reveal the final piece if it hasn't been already (on reload)
            if (emptyTileElement && emptyTileElement.classList.contains('empty-tile')) {
                emptyTileElement.classList.remove('empty-tile');
                
                const size = puzzleGridSize;
                const originalIndex = emptyTileValue;
                const originalCol = originalIndex % size;
                const originalRow = Math.floor(originalIndex / size);
                
                emptyTileElement.style.backgroundImage = `url('${puzzleImageURL}')`;
                emptyTileElement.style.backgroundPosition = 
                    `${(originalCol / (size - 1)) * 100}% ${(originalRow / (size - 1)) * 100}%`;
                emptyTileElement.style.backgroundSize = `${size * 100}% ${size * 100}%`;
                emptyTileElement.style.cursor = 'default';
            }
            
            // Display success message
            if (messageEl) {
                messageEl.style.color = 'var(--success)';
                messageEl.style.fontWeight = '700';
                messageEl.style.fontSize = '1.3rem';
                messageEl.innerText = "";
            }
        }

    } else {
        // Tiles are NOT in solved order - ensure message is cleared
        // (it was already cleared at the start, but be explicit)
        if (messageEl) messageEl.innerText = "";

        // If the persisted state incorrectly marked the puzzle as solved,
        // correct that now so a stale flag doesn't show the success UI on reload.
        if (state.puzzleState && state.puzzleState.isSolved) {
            state.puzzleState.isSolved = false;
            saveState();
            logAdmin("Corrected stale puzzle solved flag on load.");
        }
    }
}
        /* --- KEY GENERATION LOGIC --- */
        /* --- NOTIFICATION PERMISSIONS --- */
        /* --- NOTIFICATION PERMISSIONS --- */
        function requestNotificationPermission() {
            if ('Notification' in window) {
                // Register Service Worker
                if ('serviceWorker' in navigator) {
                    // Register service worker from site root to ensure proper scope
                    navigator.serviceWorker.register('/sw.js', { scope: '/' })
                        .then(registration => {
                            logAdmin('Service Worker registered successfully.');
                        })
                        .catch(error => {
                            logAdmin('Service Worker registration failed: ' + error.message);
                        });
                }
                
                // Request notification permission
                if (Notification.permission === 'default') {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            logAdmin('Notifications enabled.');
                        }
                    }).catch(err => {
                        logAdmin('Notification permission request failed: ' + err);
                    });
                }
            }
        }

        function sendKeyNotification(chestId) {
            if ('Notification' in window && Notification.permission === 'granted') {
                // Use Service Worker if available (better for mobile)
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'SHOW_NOTIFICATION',
                        chestId: chestId,
                        title: '🌟 New Key Generated!',
                        body: `A new key is ready to unlock Chest #${chestId}! Check the sidebar now.`
                    });
                } else {
                    // Fallback for browsers without Service Worker support
                    const options = {
                        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="70" font-size="80" text-anchor="middle">\u2728</text></svg>',
                        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="70" font-size="80" text-anchor="middle">\ud83d\udd11</text></svg>',
                        tag: 'key-notification-' + chestId,
                        requireInteraction: true
                    };
                    const notification = new Notification(`🌟 New Key Generated!`, {
                        body: `A new key is ready to unlock Chest #${chestId}! Check the sidebar now.`,
                        ...options
                    });
                    notification.onclick = () => {
                        window.focus();
                        notification.close();
                    };
                }
            }
        }

        function generateRandomKey() {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            let part1 = "", part2 = "";
            for(let i=0; i<4; i++) part1 += chars.charAt(Math.floor(Math.random() * chars.length));
            for(let i=0; i<6; i++) part2 += chars.charAt(Math.floor(Math.random() * chars.length));
            return `${part1}-${part2}`;
        }
        
        function generateBonusKey() {
            // Exclude any chest which has already issued its bonus to avoid re-generation
            const eligibleChests = state.chests.filter(c => c.isLocked && !c.bonusUsed);
            const bonusKeyBtn = document.getElementById('bonus-key-btn');
            const bonusKeyMsg = document.getElementById('bonus-key-message');

            if (state.pendingKey) { 
                bonusKeyMsg.innerText = "? Key already pending. Use it first!"; 
                return; 
            }
            
            if (eligibleChests.length === 0) { 
                logAdmin("Error: No chests left to unlock with bonus key."); 
                bonusKeyMsg.innerText = "All remaining chests are unlocked!"; 
                bonusKeyBtn.style.display = 'none'; 
                return; 
            }

            const target = eligibleChests.reduce((min, current) => (current.id < min.id ? current : min), eligibleChests[0]);
            
            if (!target) { 
                logAdmin("Error: Failed to identify target chest for bonus key."); 
                bonusKeyMsg.innerText = "Error: Could not find a locked chest."; 
                return; 
            }

            const newKey = generateRandomKey();
            state.pendingKey = {
                code: newKey, targetChestId: target.id, isRevealed: false, generatedAt: Date.now()
            };
            
            state.lastGenerationTime = Date.now(); 
            // Mark the bonus as issued so it won't be re-generated again from this chest
            const bonusChest = state.chests.find(c => c.id === 7);
            if (bonusChest) bonusChest.bonusUsed = true;

            saveState();
            logAdmin(`Bonus key generated for Chest #${target.id}.`);
            sendKeyNotification(target.id);
            
            bonusKeyBtn.style.display = 'none'; 
            bonusKeyMsg.style.color = 'var(--accent-glow)';
            bonusKeyMsg.innerText = `Key for Chest #${target.id} generated! Check the sidebar.`;
            updateSidebar();
        }

        function checkKeyGeneration() {
            const now = Date.now();
            if (state.pendingKey) return; 
            if (now - state.lastGenerationTime < COOLDOWN_MS && state.lastGenerationTime !== 0) return;

            // Don't consider chests that have already issued a bonus
            const eligibleChests = state.chests.filter(c => c.isLocked && !c.bonusUsed);
            if (eligibleChests.length === 0) { logAdmin("All chests unlocked!"); return; }

            const target = eligibleChests[Math.floor(Math.random() * eligibleChests.length)];
            const newKey = generateRandomKey();

            state.pendingKey = {
                code: newKey, targetChestId: target.id, isRevealed: false, generatedAt: now
            };
            
            state.lastGenerationTime = now;
            saveState();
            logAdmin(`Generated key for Chest #${target.id}`);
            sendKeyNotification(target.id);
            updateSidebar();
        }

        /* --- UNLOCK WITH ADMIN/RESET KEY CHECKS --- */
        function unlockChest(id) {
            const input = document.getElementById(`input-${id}`);
            let userKey = input.value ? input.value.trim().toUpperCase() : "";

            if (!userKey) { alert("Type the key to unlock the chest."); return; }
            
            if (userKey === ADMIN_BYPASS_KEY) {
                document.getElementById('admin-panel').style.display='block';
                logAdmin("Admin Panel unlocked via Bypass Key 'ALOK'.");
                input.value = ''; 
                return; 
            }
            
            if (userKey === MASTER_RESET_KEY) {
                if(confirm("\ud83d\udea8 WARNING: This will erase ALL progress. Proceed?")) {
                    adminResetAll(); return;
                }
            }

            if (userKey === UNLOCK_ALL_KEY) {
                const now = Date.now();
                const pendingCode = state.pendingKey && state.pendingKey.code ? String(state.pendingKey.code).toUpperCase() : '';
                const shouldConsumePending = !!state.pendingKey && state.pendingKey.targetChestId === id && state.pendingKey.isRevealed && pendingCode === UNLOCK_ALL_KEY;

                state.chests.forEach((c) => {
                    if (c.isLocked) {
                        c.isLocked = false;
                        c.key = UNLOCK_ALL_KEY;
                        c.unlockedAt = c.unlockedAt || now;
                    }
                });
                state.contentAccessTimes = state.contentAccessTimes || {};
                if (shouldConsumePending) state.pendingKey = null;

                saveState(true);
                deferFinalReveal = true;
                renderChests();
                updateSidebar();
                fireConfetti();
                setTimeout(() => {
                    deferFinalReveal = false;
                    renderChests();
                }, 1100);
                if (input) input.value = '';
                return;
            }

            const chest = state.chests.find(c => c.id === id);
            
            if (!state.pendingKey) { alert("? No key is currently active."); return; }
            if (state.pendingKey.targetChestId !== id) { alert("? This key does not fit this chest."); return; }
            if (!state.pendingKey.isRevealed) { alert("\u274c You must scratch the card first!"); return; }
            if (userKey !== state.pendingKey.code) { alert("? Invalid Key."); return; }

            chest.isLocked = false;
            chest.key = userKey;
            chest.unlockedAt = Date.now();
            state.contentAccessTimes = state.contentAccessTimes || {};
            state.contentAccessTimes[String(id)] = Date.now();
            state.pendingKey = null;

            // Do NOT wipe puzzleState here. Keep puzzle state so the reward can render.
            saveState();

            // If this was the final chest, defer showing the feedback page briefly so
            // the user can see the last chest's reward first.
            const unlockedCountAfter = state.chests.filter(c => !c.isLocked).length;
            if (unlockedCountAfter === TOTAL_CHESTS) {
                deferFinalReveal = true;
                renderChests();
                updateSidebar();
                fireConfetti();

                // After a short delay reveal the feedback section (final page)
                setTimeout(() => {
                    deferFinalReveal = false;
                    renderChests();
                }, 1100);
            } else {
                renderChests();
                updateSidebar();
                fireConfetti();
            }
        }

        /* --- UI RENDERER --- */
        function escapeHtmlAttr(value) {
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }

        function normalizeGalleryContent(content) {
            const out = { thumbUrls: [], fullUrls: [] };
            if (!content) return out;

            // New format: { images: [{ thumb, full }, ...] } or { images: ["...", "..."] }
            if (typeof content === 'object' && !Array.isArray(content) && Array.isArray(content.images)) {
                return normalizeGalleryContent(content.images);
            }

            if (!Array.isArray(content)) return out;

            content.forEach((item) => {
                if (!item) return;
                if (typeof item === 'string') {
                    out.thumbUrls.push(item);
                    out.fullUrls.push(item);
                    return;
                }
                if (typeof item === 'object') {
                    const full = item.full || item.url || item.src || item.original || '';
                    const thumb = item.thumb || item.thumbnail || full || '';
                    if (full || thumb) {
                        out.thumbUrls.push(thumb || full);
                        out.fullUrls.push(full || thumb);
                    }
                }
            });

            return out;
        }

        function normalizeWallpaperContent(content) {
            if (typeof content === 'string') {
                return { preview: content, full: content, download: content };
            }
            if (content && typeof content === 'object') {
                const full = content.full || content.url || content.src || '';
                const preview = content.preview || content.thumb || content.thumbnail || full;
                const download = content.download || full || preview;
                return { preview, full: full || preview, download };
            }
            return { preview: '', full: '', download: '' };
        }

        function renderUnconfiguredContentNotice() {
            return `<p class="gift-text">Content not configured by admin yet.</p>`;
        }

        function injectPlaylistEmbed(anchorEl) {
            if (!anchorEl) return;
            const src = (anchorEl.getAttribute('data-src') || '').trim();
            if (!src) return;
            if (!/^https:\/\/open\.spotify\.com\/embed\//i.test(src)) {
                anchorEl.textContent = 'Invalid Spotify embed URL';
                return;
            }
            const wrapper = document.createElement('div');
            wrapper.className = 'media-wrapper';
            wrapper.innerHTML = `<iframe src="${escapeHtmlAttr(src)}" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
            anchorEl.replaceWith(wrapper);
        }

        function normalizeSpotifyEmbedUrl(value) {
            const raw = (value || '').trim();
            if (!raw) return '';
            if (/^https:\/\/open\.spotify\.com\/embed\//i.test(raw)) return raw;
            const m = raw.match(/^https:\/\/open\.spotify\.com\/(playlist|album|track)\/([A-Za-z0-9]+)(\?.*)?$/i);
            if (!m) return '';
            const type = m[1].toLowerCase();
            const id = m[2];
            return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator`;
        }

        function extractSpotifySourceFromAny(content) {
            if (typeof content === 'string') {
                const raw = content.trim();
                if (!raw) return '';
                // Legacy HTML format support:
                // <a class="playlist-load" data-src="https://open.spotify.com/embed/playlist/...">
                const dataSrcMatch = raw.match(/data-src\s*=\s*["']([^"']+)["']/i);
                if (dataSrcMatch && dataSrcMatch[1]) return dataSrcMatch[1].trim();

                const hrefMatch = raw.match(/href\s*=\s*["']([^"']+)["']/i);
                if (hrefMatch && hrefMatch[1]) return hrefMatch[1].trim();

                return raw;
            }
            if (content && typeof content === 'object') {
                return (content.url || content.src || content.embed || '').trim();
            }
            return '';
        }

        function getGiftHTML(type, content, chestId) { 
            let html = '';
            switch(type) {
                case 'letter':
                case 'text':
                case 'coupon':
                    html = (typeof content === 'string' && content.trim())
                        ? `<p class="gift-text">${content}</p>`
                        : renderUnconfiguredContentNotice();
                    break;
                case 'gallery': {
                    const media = normalizeGalleryContent(content);
                    if (!media.thumbUrls.length) {
                        html = renderUnconfiguredContentNotice();
                        break;
                    }
                    html = '<div class="gift-gallery">';
                    media.thumbUrls.forEach((url, idx) => {
                        const cls = (chestId === 6) ? 'chest6-img' : '';
                        const usesLightbox = chestId === 6 || chestId === 9;
                        const thumbAttr = escapeHtmlAttr(url);
                        const lightboxData = JSON.stringify(media.fullUrls).replace(/"/g, '&quot;');
                        if (chestId === 6) {
                            html += `<span class="chest6-img-wrap"><img src="${thumbAttr}" loading="lazy" decoding="async" class="${cls}" onclick="openLightbox(${idx}, ${lightboxData})"></span>`;
                        } else if (usesLightbox) {
                            html += `<img src="${thumbAttr}" loading="lazy" decoding="async" class="${cls}" onclick="openLightbox(${idx}, ${lightboxData})">`;
                        } else {
                            const openUrl = JSON.stringify(media.fullUrls[idx] || url).replace(/"/g, '&quot;');
                            html += `<img src="${thumbAttr}" loading="lazy" decoding="async" class="${cls}" onclick="window.open(${openUrl},'_blank')">`;
                        }
                    });
                    html += '</div>';
                    break;
                }
                case 'playlist': {
                    const rawUrl = extractSpotifySourceFromAny(content);
                    const embedSrc = normalizeSpotifyEmbedUrl(rawUrl);
                    html = embedSrc
                        ? `<div class="media-wrapper spotify-playlist-wrapper"><iframe src="${escapeHtmlAttr(embedSrc)}" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`
                        : renderUnconfiguredContentNotice();
                    break;
                }
                case 'video':
                    html = (typeof content === 'string' && content.trim())
                        ? `<div class="media-wrapper"><iframe src="${content}" allowfullscreen></iframe></div>`
                        : renderUnconfiguredContentNotice();
                    break;
                case 'wallpaper': {
                    const wp = normalizeWallpaperContent(content);
                    if (!wp.preview && !wp.full && !wp.download) {
                        html = renderUnconfiguredContentNotice();
                        break;
                    }
                    const preview = escapeHtmlAttr(wp.preview);
                    const full = escapeHtmlAttr(wp.full);
                    const dl = escapeHtmlAttr(wp.download);
                    html = `<div class="gift-wallpaper"><img src="${preview}" loading="lazy" decoding="async" alt="Wallpaper" width="100%" style="border-radius:5px; border:2px solid black; cursor:pointer;" onclick="openLightbox(0, ${JSON.stringify([wp.full]).replace(/"/g, '&quot;')})"><a href="${dl}" target="_blank" class="btn btn-download" style="width:100%">Download High-Res</a></div>`;
                    break;
                }
                case 'link':
                    html = (typeof content === 'string' && content.trim())
                        ? `<a href="${content}" target="_blank" class="gift-link-card">CLICK TO OPEN GIFT \u2197</a>`
                        : renderUnconfiguredContentNotice();
                    break;
                
                case 'bonus_key': {
                    const nextLockedChest = state.chests.find(c => c.isLocked);
                    const targetId = nextLockedChest ? nextLockedChest.id : 'N/A';
                    const chestState = state.chests.find(c => c.id === chestId) || {};
                    const alreadyUsed = !!chestState.bonusUsed;
                    const jokeText = (content && typeof content === 'object' && typeof content.joke === 'string' && content.joke.trim())
                        ? content.joke
                        : 'Bonus content not configured by admin yet.';

                    const btnDisplay = (state.pendingKey || alreadyUsed) ? 'none' : 'block';
                    const usedMsg = alreadyUsed ? '<p style="margin-top:10px; font-size:0.9rem; color:var(--text-muted);">Bonus used.</p>' : '';

                    html = `
                        <p class="gift-text">${jokeText}</p>
                        <hr style="border-color: rgba(255,255,255,0.1); margin: 1rem 0;">
                        <p style="margin-bottom: 0.5rem; font-weight: 600; color: var(--accent);">BONUS UNLOCK: Skip the wait!</p>
                        <button id="bonus-key-btn" class="btn" style="width: 100%; display: ${btnDisplay};" onclick="generateBonusKey()">
                            Scratch Key for Chest #${targetId}
                        </button>
                        ${usedMsg}
                        <p id="bonus-key-message" style="margin-top: 10px; font-size: 0.8rem; color: var(--success);"></p>
                    `;
                    break;
                }
                    break;

                case 'puzzle':
                    if (content && typeof content === 'object' && typeof content.imageUrl === 'string' && content.imageUrl.trim()) {
                        setTimeout(() => createPuzzle(content), 100); 
                        html = `
                            <div class="puzzle-wrapper">
                                <p style="font-weight: 600; color: var(--text-main);">Rearrange the tiles to reveal the final image!</p>
                                <div class="puzzle-grid" id="puzzle-grid-container" >
                                    </div>
                                <button class="btn" id="puzzle-done-btn" onclick="handlePuzzleDone()" style="margin-top: 1.5rem;" disabled>Done</button>
                                <p id="puzzle-message"></p>
                            </div>
                        `;
                    } else {
                        html = renderUnconfiguredContentNotice();
                    }
                    break;
                
                default:
                    html = (typeof content === 'string' && content.trim())
                        ? `<p>${content}</p>`
                        : renderUnconfiguredContentNotice();
            }
            return html;
        }

        function renderChests() {
            const grid = document.getElementById('chests-grid');
            const finalPage = document.getElementById('final-congrats-page');
            const progressPanel = document.getElementById('progress-panel');
            const sidebarStatus = document.getElementById('sidebar-status');
            const restartWrapper = document.getElementById('restart-input-wrapper');
            
            let unlockedCount = state.chests.filter(c => !c.isLocked).length;

            // Render all chest cards into the grid (both locked and unlocked)
            grid.innerHTML = '';
            state.chests.forEach(chestState => {
                const staticData = CHEST_DATA.find(c => c.id === chestState.id);
                const el = document.createElement('div');
                el.className = `glass-panel chest-card ${!chestState.isLocked ? 'unlocked' : ''}`;
                
                if (chestState.isLocked) {
                    el.innerHTML = `
                        <div class="chest-icon">\ud83d\udd12</div>
                        <div class="chest-title">Chest #${chestState.id}</div>
                        <p style="font-size: 0.8rem; color: #888; margin-bottom: 0.5rem;">Locked — Needs Key</p>
                        <div class="input-group">
                            <input type="text" id="input-${chestState.id}" class="chest-input" placeholder="XXXX-XXXXXX">
                            <button class="btn btn-sm" onclick="unlockChest(${chestState.id})">\ud83d\udd13</button>
                        </div>`;
                } else {
                    const date = new Date(chestState.unlockedAt).toLocaleDateString();
                    el.innerHTML = `
                        <div class="chest-icon">${staticData.icon}</div>
                        <div class="chest-title">${staticData.label}</div>
                        <p style="font-size: 0.7rem; color: var(--success); text-transform:uppercase; font-weight:bold;">Unlocked: ${date}</p>
                        <div class="gift-container">
                            <span class="gift-label">Your Gift:</span>
                            ${getGiftHTML(staticData.type, staticData.content, chestState.id)}
                        </div>`;
                }
                grid.appendChild(el);
            });

            if (unlockedCount === TOTAL_CHESTS) {
                // --- Show grid (so last chest reward is visible) but hide sidebar; final page
                // is revealed after a short defer period so the last reward appears first.
                grid.style.display = 'grid';
                progressPanel.style.display = 'block';
                sidebarStatus.style.display = 'none';
                restartWrapper.style.display = 'block';
                finalPage.style.display = deferFinalReveal ? 'none' : 'block';

                // Re-apply feedback state if already sent
                if (state.feedbackSent) {
                    sendFeedback(typeof state.feedbackSent === 'string' ? state.feedbackSent : state.feedbackSent.type, false);
                    const inputEl = document.getElementById('restart-input');
                    const submitBtn = document.getElementById('feedback-submit-btn');
                    if (inputEl) inputEl.disabled = true;
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.innerText = 'Submitted';
                    }
                }

                logAdmin("All chests unlocked. Displaying chests grid and final page (deferred=" + deferFinalReveal + ").");
            } else {
                // Regular state: show grid and sidebar, hide final page
                grid.style.display = 'grid';
                progressPanel.style.display = 'block';
                sidebarStatus.style.display = 'block';
                finalPage.style.display = 'none';
            }


            const pct = (unlockedCount / TOTAL_CHESTS) * 100;
            document.getElementById('progress-bar').style.width = `${pct}%`;
            document.getElementById('progress-text').innerText = `${unlockedCount}/${TOTAL_CHESTS} chests unlocked`;

            // Check if the puzzle chest is unlocked and puzzle state exists - validate tiles in checkPuzzleWin()
            if (state.puzzleState && state.chests.find(c => c.id === 10 && !c.isLocked)) {
                // Use a slight delay to ensure the DOM elements are ready after rendering
                setTimeout(checkPuzzleWin, 50); 
            }
        }        function updateSidebar() {
            const section = document.getElementById('pending-key-section');
            section.style.display = (state.pendingKey && !state.pendingKey.isRevealed) ? 'block' : 'none';
        }
        
        function updateTimer() {
            const timerEl = document.getElementById('cooldown-timer');
            if (state.pendingKey) { timerEl.innerText = "KEY PENDING"; timerEl.style.color = "var(--accent)"; return; }
            
            const diff = (state.lastGenerationTime + COOLDOWN_MS) - Date.now();
            if (diff <= 0) {
                timerEl.innerText = "READY"; timerEl.style.color = "var(--success)";
                checkKeyGeneration();
                updateSidebar();
            } else {
                const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                timerEl.innerText = `${d}d ${h}h`; timerEl.style.color = "var(--text-muted)";
            }
        }
        
        /* --- SCRATCH CARD SYSTEM (Omitted for brevity, kept functional) --- */
        let canvas, ctx, isDrawing = false;
        
        function openScratchModal() {
            if (!state.pendingKey) return;
            document.body.style.overflow = 'hidden'; 
            
            const modal = document.getElementById('scratch-modal');
            modal.classList.add('active');
            
            document.getElementById('revealed-key-text').innerText = state.pendingKey.code;
            document.getElementById('target-chest-hint').innerText = `For Chest #${state.pendingKey.targetChestId}`;
            document.getElementById('scratch-overlay-text').classList.remove('faded');
            
            // Reset the close button state for a fresh scratch card
            const closeBtn = document.getElementById('close-scratch-btn');
            if (closeBtn) {
                closeBtn.disabled = true;
                closeBtn.innerText = 'Keep Scratching...';
                closeBtn.onclick = null;
            }
            
            setTimeout(setupCanvas, 50); 
        }

        function closeScratchModal() {
            document.body.style.overflow = ''; 
            document.getElementById('scratch-modal').classList.remove('active');
        }

        function setupCanvas() {
            canvas = document.getElementById('scratch-canvas');
            ctx = canvas.getContext('2d');
            const wrapper = document.getElementById('scratch-wrapper');
            
            const dpr = window.devicePixelRatio || 1;
            const rect = wrapper.getBoundingClientRect();
            
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            
            ctx.scale(dpr, dpr);
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;

            // Adaptive color based on theme
            const theme = document.documentElement.getAttribute('data-theme') || 'dark';
            const scratchColor = theme === 'light' ? '#d4a5ff' : '#C0C0C0';
            
            ctx.fillStyle = scratchColor;
            ctx.fillRect(0, 0, rect.width, rect.height);
            
            canvas.onmousedown = startScratch;
            canvas.onmousemove = moveScratch;
            canvas.onmouseup = endScratch;
            
            canvas.ontouchstart = startScratch;
            canvas.ontouchmove = moveScratch;
            canvas.ontouchend = endScratch;
        }
        
        function getPos(e) {
            const rect = canvas.getBoundingClientRect();
            let clientX, clientY;
            
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            return { x: clientX - rect.left, y: clientY - rect.top };
        }

        function startScratch(e) {
            e.preventDefault(); 
            isDrawing = true;
            document.getElementById('scratch-overlay-text').classList.add('faded');
            scratch(e);
        }
        function moveScratch(e) { e.preventDefault(); if (isDrawing) scratch(e); }
        function endScratch(e) { e.preventDefault(); isDrawing = false; checkScratchPercent(); }

        function scratch(e) {
            const pos = getPos(e);
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 25, 0, Math.PI * 2);
            ctx.fill();
        }

        function checkScratchPercent() {
            const width = canvas.width;
            const height = canvas.height;
            const imageData = ctx.getImageData(0, 0, width, height);
            const pixels = imageData.data;
            let clearPixels = 0;
            
            // Fix applied in the previous step, kept for completeness.
            for (let i = 3; i < pixels.length; i += 10) { 
                if (pixels[i] === 0) clearPixels++;
            }
            
            const totalPixels = pixels.length / 4;
            
            if (clearPixels / totalPixels > 0.35) {
                ctx.clearRect(0,0, width, height);
                const btn = document.getElementById('close-scratch-btn');
                btn.disabled = false;
                btn.innerText = "Close & Copy Key";
                btn.onclick = handleCopyAndClose;
            }
        }
        
        // --- MOBILE ROBUST COPY ---
        function handleCopyAndClose() {
            const keyText = state.pendingKey.code;
            
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(keyText).then(finalizeClose).catch(manualCopyFallback);
            } else {
                manualCopyFallback();
            }
        }

        function manualCopyFallback() {
            const textArea = document.createElement("textarea");
            textArea.value = state.pendingKey.code;
            textArea.style.position = "fixed";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                finalizeClose();
            } catch (err) {
                alert("Could not auto-copy. Please long-press the code to copy it manually.");
                finalizeClose(false); 
            }
            document.body.removeChild(textArea);
        }

        function finalizeClose(autoClosed = true) {
            const btn = document.getElementById('close-scratch-btn');
            btn.innerText = "Copied!";
            
            if(autoClosed) {
                setTimeout(() => {
                    state.pendingKey.isRevealed = true;
                    saveState();
                    updateSidebar();
                    closeScratchModal();
                    renderChests(); 
                }, 800);
            } else {
                 state.pendingKey.isRevealed = true;
                 saveState();
                 updateSidebar();
                 renderChests(); 
            }
        }

        /* --- HELPERS & RESET --- */
        function uiSoftReset() {
            if(confirm("Layout looking weird? This will reset the tutorial and visuals, but keep your unlocked chests safe.")) {
                state.tutorialSeen = false;
                saveState();
                location.reload();
            }
        }

        function pushStateToServer(snapshot) {
            saveQueue = saveQueue
                .catch(() => {})
                .then(() =>
                    fetch(API_STATE_URL, {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ state: snapshot })
                    }).catch(err => console.error('State save failed:', err))
                );
            return saveQueue;
        }

        function saveState(immediate = false) {
            if (!currentUser) return Promise.resolve();
            state.localUpdatedAt = Date.now();
            const snapshot = JSON.parse(JSON.stringify(state));
            writeStateCache(snapshot);
            pendingStateSnapshot = snapshot;

            if (immediate) {
                if (saveDebounceTimer) {
                    clearTimeout(saveDebounceTimer);
                    saveDebounceTimer = null;
                }
                const next = pendingStateSnapshot;
                pendingStateSnapshot = null;
                return pushStateToServer(next);
            }

            if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
            saveDebounceTimer = setTimeout(() => {
                saveDebounceTimer = null;
                const next = pendingStateSnapshot;
                pendingStateSnapshot = null;
                if (next) pushStateToServer(next);
            }, SAVE_DEBOUNCE_MS);
            return saveQueue;
        }

        async function loadState() {
            try {
                const res = await fetch(API_STATE_URL, {
                    method: 'GET',
                    credentials: 'include'
                });
                if (res.status === 401) {
                    applyUserPersonalization(null);
                    writeBootProfile(null);
                    const loginModal = document.getElementById('login-modal');
                    if (loginModal) loginModal.classList.add('active');
                    setLoginStatus('Verify your identity to continue.');
                    setAppReady();
                    return false;
                }
                if (!res.ok) throw new Error(`State load failed: ${res.status}`);
                const data = await res.json();
                if (data && data.user) applyUserPersonalization(data.user);
                const serverState = hydrateState(data.state);
                const cachedState = readStateCache();
                const hydratedCache = cachedState ? hydrateState(cachedState) : null;
                const serverTs = Number(serverState.localUpdatedAt || 0);
                const cacheTs = Number(hydratedCache && hydratedCache.localUpdatedAt ? hydratedCache.localUpdatedAt : 0);

                if (hydratedCache && cacheTs > serverTs) {
                    // Local cache is newer than server snapshot: keep user progress and re-sync.
                    state = hydratedCache;
                    writeStateCache(state);
                    setTimeout(() => {
                        saveState(true).catch(() => {});
                    }, 0);
                } else {
                    state = serverState;
                    writeStateCache(state);
                }
                return true;
            } catch (err) {
                console.error(err);
                const cached = readStateCache();
                if (cached) {
                    state = hydrateState(cached);
                    return true;
                }
                setLoginStatus('Unable to load saved progress right now. Please retry.', true);
                return false;
            }
        }

        function resetStateOnServer() {
            return fetch(API_RESET_URL, {
                method: 'POST',
                credentials: 'include'
            });
        }
        function closeTutorial() {
            state.tutorialSeen = true;
            saveState();
            closeScratchModal(); 
            document.getElementById('tutorial-modal').classList.remove('active');
        }

        /* --- CONFETTI --- */
        function fireConfetti() {
            const cCanvas = document.getElementById('confetti-canvas');
            const cCtx = cCanvas.getContext('2d');
            cCanvas.width = window.innerWidth; cCanvas.height = window.innerHeight;
            
            const particles = Array.from({length: 60}, () => ({
                x: cCanvas.width/2, y: cCanvas.height/2,
                vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15,
                life: 100 + Math.random()*50,
                color: ['#bb86fc', '#03dac6', '#fff', '#ff5f5f'][Math.floor(Math.random()*4)],
                size: Math.random()*8+2
            }));

            function animate() {
                cCtx.clearRect(0,0,cCanvas.width,cCanvas.height);
                let active = false;
                particles.forEach(p => {
                    if(p.life > 0) {
                        p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life--;
                        cCtx.fillStyle = p.color; cCtx.fillRect(p.x, p.y, p.size, p.size);
                        active = true;
                    }
                });
                if(active) requestAnimationFrame(animate);
                else cCtx.clearRect(0,0,cCanvas.width,cCanvas.height);
            }
            animate();
        }

        /* --- ADMIN CONTROLS --- */
        function logAdmin(m) {
            const log = document.getElementById('admin-log');
            const d = document.createElement('div');
            d.innerText = `[${new Date().toLocaleTimeString()}] ${m}`;
            log.prepend(d);
        }
        function adminForceGenerate() { state.lastGenerationTime=0; checkKeyGeneration(); logAdmin("Force Gen"); }
        function adminForceReveal() { if(state.pendingKey) { state.pendingKey.isRevealed=true; saveState(); updateSidebar(); logAdmin("Force Reveal"); } }
        function adminResetAll() { 
            if(confirm("\ud83d\udea8 WARNING: This will erase ALL progress and restart the entire experience. Proceed?")) {
                resetStateOnServer()
                    .then((res) => {
                        if (!res.ok) throw new Error('Reset failed');
                        clearAllStateCaches();
                        logAdmin("DATA ERASED. RESTARTING.");
                        location.reload();
                    })
                    .catch(() => alert("Unable to reset data on server right now."));
            }
        }

        async function openUserManager() {
            const modal = document.getElementById('user-manager-modal');
            if (!modal) return;
            modal.classList.add('active');
            await refreshManagedUsers();
        }

        function closeUserManager() {
            const modal = document.getElementById('user-manager-modal');
            if (modal) modal.classList.remove('active');
        }

        function setUserManagerStatus(text, isError = false) {
            const el = document.getElementById('um-status');
            if (!el) return;
            el.textContent = text || '';
            el.style.color = isError ? 'var(--danger)' : 'var(--text-muted)';
        }

        function readUserManagerPayload() {
            const userId = (document.getElementById('um-user-id').value || '').trim();
            const name = (document.getElementById('um-name').value || '').trim();
            const phone = (document.getElementById('um-phone').value || '').trim();
            const pageTitle = (document.getElementById('um-page-title').value || '').trim();
            const isActive = (document.getElementById('um-active').value || 'true') === 'true';
            const notes = (document.getElementById('um-notes').value || '').trim();
            const rawJson = (document.getElementById('um-content-json').value || '').trim();
            let contentProfile = {};
            if (rawJson) contentProfile = JSON.parse(rawJson);
            return { userId, name, phone, pageTitle, isActive, notes, contentProfile };
        }

        async function refreshManagedUsers() {
            const listEl = document.getElementById('um-list');
            if (!listEl) return;
            setUserManagerStatus('Loading users...');
            try {
                const res = await fetch(API_ADMIN_USERS_URL, {
                    method: 'GET',
                    credentials: 'include',
                    headers: adminAuthHeaders()
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.ok) throw new Error(data.error || `Failed (${res.status})`);
                const users = Array.isArray(data.users) ? data.users : [];
                listEl.innerHTML = users.length
                    ? users.map((u) => `<div>${u.userId} | ${u.name} | ${u.phone} | ${u.isActive ? 'ACTIVE' : 'INACTIVE'}</div>`).join('')
                    : '<div>No users found.</div>';
                setUserManagerStatus(`Loaded ${users.length} users.`);
            } catch (err) {
                setUserManagerStatus(`Load failed: ${err.message}`, true);
            }
        }

        async function saveManagedUser() {
            let payload;
            try {
                payload = readUserManagerPayload();
            } catch (err) {
                setUserManagerStatus(`Invalid JSON: ${err.message}`, true);
                return;
            }
            setUserManagerStatus('Saving user...');
            try {
                const res = await fetch(API_ADMIN_USERS_URL, {
                    method: 'POST',
                    credentials: 'include',
                    headers: adminAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ user: payload })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.ok) throw new Error(data.error || `Failed (${res.status})`);
                setUserManagerStatus(`Saved user ${data.user.userId}.`);
                await refreshManagedUsers();
            } catch (err) {
                setUserManagerStatus(`Save failed: ${err.message}`, true);
            }
        }

        async function deleteManagedUser() {
            const userId = (document.getElementById('um-user-id').value || '').trim();
            if (!userId) {
                setUserManagerStatus('Enter user_id to delete.', true);
                return;
            }
            if (!confirm(`Delete user ${userId}?`)) return;
            setUserManagerStatus('Deleting user...');
            try {
                const res = await fetch(API_ADMIN_USERS_URL, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: adminAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ userId })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.ok) throw new Error(data.error || `Failed (${res.status})`);
                setUserManagerStatus(data.deleted ? `Deleted ${userId}.` : `User ${userId} not found.`);
                await refreshManagedUsers();
            } catch (err) {
                setUserManagerStatus(`Delete failed: ${err.message}`, true);
            }
        }

        function openAnalyticsManager() {
            const modal = document.getElementById('analytics-modal');
            if (!modal) return;
            modal.classList.add('active');
            const fromEl = document.getElementById('an-from-ms');
            const toEl = document.getElementById('an-to-ms');
            if (fromEl && toEl && !fromEl.value && !toEl.value) {
                setAnalyticsPreset('7d');
                return;
            }
            loadAnalytics();
        }

        function closeAnalyticsManager() {
            const modal = document.getElementById('analytics-modal');
            if (modal) modal.classList.remove('active');
        }

        function setAnalyticsStatus(text, isError = false) {
            const el = document.getElementById('an-status');
            if (!el) return;
            el.textContent = text || '';
            el.style.color = isError ? 'var(--danger)' : 'var(--text-muted)';
        }

        function toLocalInputValue(ts) {
            const d = new Date(ts);
            const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
            return local.toISOString().slice(0, 16);
        }

        function setAnalyticsPreset(preset) {
            const fromEl = document.getElementById('an-from-ms');
            const toEl = document.getElementById('an-to-ms');
            if (!fromEl || !toEl) return;
            const now = Date.now();
            if (preset === 'clear') {
                fromEl.value = '';
                toEl.value = '';
                loadAnalytics();
                return;
            }
            if (preset === 'today') {
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                fromEl.value = toLocalInputValue(d.getTime());
                toEl.value = toLocalInputValue(now);
                loadAnalytics();
                return;
            }
            const days = preset === '30d' ? 30 : 7;
            const from = now - days * 24 * 60 * 60 * 1000;
            fromEl.value = toLocalInputValue(from);
            toEl.value = toLocalInputValue(now);
            loadAnalytics();
        }

        function getAnalyticsQuery() {
            const fromRaw = (document.getElementById('an-from-ms').value || '').trim();
            const toRaw = (document.getElementById('an-to-ms').value || '').trim();
            const userId = (document.getElementById('an-user-id').value || '').trim();
            const qs = new URLSearchParams();
            const fromTs = fromRaw ? new Date(fromRaw).getTime() : 0;
            const toTs = toRaw ? new Date(toRaw).getTime() : 0;
            if (Number.isFinite(fromTs) && fromTs > 0) qs.set('fromMs', String(fromTs));
            if (Number.isFinite(toTs) && toTs > 0) qs.set('toMs', String(toTs));
            if (userId) qs.set('userId', userId);
            return qs.toString();
        }

        function renderAnalyticsSummary(summary) {
            const root = document.getElementById('an-summary');
            if (!root) return;
            const cards = [
                ['Users (range)', summary.usersActiveInRange || 0],
                ['Total Sessions', summary.totalSessions || 0],
                ['Active Sessions', summary.activeSessions || 0],
                ['Avg Duration (sec)', summary.avgDurationSec || 0],
                ['Total Screen (sec)', summary.totalScreenSec || 0],
                ['Total Events', summary.totalEvents || 0],
                ['Feedback Count', summary.feedbackCount || 0]
            ];
            root.innerHTML = cards.map(([k, v]) => `
                <div style="padding:0.6rem; border:1px solid var(--glass-border); border-radius:8px; background:var(--glass);">
                    <div style="font-size:0.72rem; color:var(--text-muted);">${k}</div>
                    <div style="font-size:1.1rem; color:var(--accent); font-weight:700;">${v}</div>
                </div>
            `).join('');
        }

        function renderAnalyticsTable(rows) {
            const el = document.getElementById('an-table');
            if (!el) return;
            if (!rows || !rows.length) {
                el.innerHTML = '<div>No sessions for selected filters.</div>';
                renderAnalyticsPagination();
                return;
            }
            const start = (analyticsState.page - 1) * analyticsState.pageSize;
            const end = start + analyticsState.pageSize;
            const pageRows = rows.slice(start, end);
            el.innerHTML = pageRows.map((r) => {
                return `<div>${r.userId} | ${r.name} | ${r.loginTimeIst} | ${r.logoutTimeIst || '-'} | dur:${r.durationSec}s | screen:${r.screenTimeSec}s | ${r.status}</div>`;
            }).join('');
            renderAnalyticsPagination();
        }

        function renderAnalyticsPagination() {
            const el = document.getElementById('an-pagination');
            if (!el) return;
            const total = analyticsState.rows.length;
            if (!total) {
                el.innerHTML = '';
                return;
            }
            const totalPages = Math.max(1, Math.ceil(total / analyticsState.pageSize));
            analyticsState.page = Math.min(Math.max(1, analyticsState.page), totalPages);
            el.innerHTML = `
                <button class="btn btn-sm" ${analyticsState.page <= 1 ? 'disabled' : ''} onclick="changeAnalyticsPage(-1)">Prev</button>
                <span style="color:var(--text-muted); font-size:0.82rem;">Page ${analyticsState.page}/${totalPages} | Rows ${total}</span>
                <button class="btn btn-sm" ${analyticsState.page >= totalPages ? 'disabled' : ''} onclick="changeAnalyticsPage(1)">Next</button>
            `;
        }

        function changeAnalyticsPage(delta) {
            analyticsState.page += Number(delta || 0);
            renderAnalyticsTable(analyticsState.rows);
        }

        function renderAnalyticsChart(chart) {
            const canvas = document.getElementById('an-chart');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const sessionMap = (chart && chart.sessionsByDay) ? chart.sessionsByDay : {};
            const screenMap = (chart && chart.screenByDay) ? chart.screenByDay : {};
            const labels = Array.from(new Set([...Object.keys(sessionMap), ...Object.keys(screenMap)])).sort();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(255,255,255,0.03)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (!labels.length) {
                ctx.fillStyle = '#888';
                ctx.font = '14px Poppins';
                ctx.fillText('No data for chart', 20, 30);
                return;
            }

            const values = labels.map((k) => Number(sessionMap[k] || 0));
            const screenValues = labels.map((k) => Number(screenMap[k] || 0));
            const max = Math.max(...values, 1);
            const maxScreen = Math.max(...screenValues, 1);
            const padding = 40;
            const w = canvas.width - padding * 2;
            const h = canvas.height - padding * 2;
            const bw = Math.max(8, Math.floor(w / labels.length) - 8);

            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.beginPath();
            ctx.moveTo(padding, padding);
            ctx.lineTo(padding, padding + h);
            ctx.lineTo(padding + w, padding + h);
            ctx.stroke();

            labels.forEach((label, i) => {
                const val = values[i];
                const bh = Math.round((val / max) * (h - 10));
                const x = padding + i * (w / labels.length) + 4;
                const y = padding + h - bh;
                ctx.fillStyle = 'rgba(107, 47, 181, 0.8)';
                ctx.fillRect(x, y, bw, bh);
                ctx.fillStyle = '#c8b8e0';
                ctx.font = '10px Poppins';
                const text = label.slice(5);
                ctx.fillText(text, x, padding + h + 12);
            });

            // Screen-time line series
            ctx.strokeStyle = 'rgba(3, 218, 198, 0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            labels.forEach((label, i) => {
                const v = Number(screenMap[label] || 0);
                const y = padding + h - Math.round((v / maxScreen) * (h - 10));
                const x = padding + i * (w / labels.length) + Math.floor(bw / 2) + 4;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();

            ctx.fillStyle = '#c8b8e0';
            ctx.font = '11px Poppins';
            ctx.fillText('Bars: Sessions', padding, 14);
            ctx.fillStyle = 'rgba(3, 218, 198, 0.95)';
            ctx.fillText('Line: Screen Time (sec)', padding + 130, 14);
        }

        async function loadAnalytics() {
            setAnalyticsStatus('Loading analytics...');
            try {
                const qs = getAnalyticsQuery();
                const res = await fetch(`${API_ADMIN_ANALYTICS_URL}${qs ? `?${qs}` : ''}`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: adminAuthHeaders()
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.ok) throw new Error(data.error || `Failed (${res.status})`);
                const analytics = data.analytics || {};
                renderAnalyticsSummary(analytics.summary || {});
                renderAnalyticsChart(analytics.chart || {});
                analyticsState.rows = (analytics.rows && analytics.rows.sessions) || [];
                analyticsState.page = 1;
                renderAnalyticsTable(analyticsState.rows);
                setAnalyticsStatus('Analytics loaded.');
            } catch (err) {
                setAnalyticsStatus(`Analytics failed: ${err.message}`, true);
            }
        }

        function downloadAnalyticsSessionsCsv() {
            const qs = getAnalyticsQuery();
            const key = encodeURIComponent(getAdminKeyFromUI());
            const url = `${API_ADMIN_ANALYTICS_CSV_URL}${qs ? `?${qs}&` : '?'}key=${key}`;
            window.open(url, '_blank');
        }

        /* --- LIGHTBOX VIEWER FOR CHEST 6 --- */
        let lightboxState = {
            images: [],
            currentIndex: 0,
            isDragging: false,
            startX: 0,
            currentX: 0
        };

        function markContentAccess(chestId) {
            if (!chestId) return;
            state.contentAccessTimes = state.contentAccessTimes || {};
            state.contentAccessTimes[String(chestId)] = Date.now();
            saveState();
        }

        function resolveChestIdByAsset(assetPath) {
            const entry = CHEST_DATA.find((c) => {
                if (!c) return false;
                if (c.type === 'gallery') {
                    const media = normalizeGalleryContent(c.content);
                    return media.fullUrls.includes(assetPath) || media.thumbUrls.includes(assetPath);
                }
                if (c.type === 'wallpaper') {
                    const wp = normalizeWallpaperContent(c.content);
                    return wp.full === assetPath || wp.preview === assetPath || wp.download === assetPath;
                }
                if (Array.isArray(c.content)) return c.content.includes(assetPath);
                return c.content === assetPath;
            });
            return entry ? entry.id : null;
        }

        function openLightbox(index, images) {
            lightboxState.images = images;
            lightboxState.currentIndex = index;
            lightboxState.isDragging = false;
            const openedAsset = Array.isArray(images) ? images[index] : null;
            const chestId = resolveChestIdByAsset(openedAsset);
            markContentAccess(chestId);
            
            const modal = document.getElementById('lightbox-modal');
            const image = document.getElementById('lightbox-image');
            const counter = document.getElementById('lightbox-index');
            const total = document.getElementById('lightbox-total');
            
            image.src = images[index];
            counter.textContent = index + 1;
            total.textContent = images.length;
            
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Add keyboard navigation
            document.addEventListener('keydown', handleLightboxKeyboard);
            
            // Add touch/mouse drag support
            image.addEventListener('mousedown', startDrag);
            image.addEventListener('touchstart', startDrag, { passive: false });
            document.addEventListener('mousemove', dragMove, { passive: false });
            document.addEventListener('touchmove', dragMove, { passive: false });
            document.addEventListener('mouseup', endDrag);
            document.addEventListener('touchend', endDrag);
        }

        function closeLightbox() {
            const modal = document.getElementById('lightbox-modal');
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
            
            // Remove event listeners
            document.removeEventListener('keydown', handleLightboxKeyboard);
            const image = document.getElementById('lightbox-image');
            image.removeEventListener('mousedown', startDrag);
            image.removeEventListener('touchstart', startDrag);
            document.removeEventListener('mousemove', dragMove);
            document.removeEventListener('touchmove', dragMove);
            document.removeEventListener('mouseup', endDrag);
            document.removeEventListener('touchend', endDrag);
        }

        function lightboxNext() {
            if (lightboxState.currentIndex < lightboxState.images.length - 1) {
                lightboxState.currentIndex++;
                updateLightboxImage();
            }
        }

        function lightboxPrev() {
            if (lightboxState.currentIndex > 0) {
                lightboxState.currentIndex--;
                updateLightboxImage();
            }
        }

        function updateLightboxImage() {
            const image = document.getElementById('lightbox-image');
            const counter = document.getElementById('lightbox-index');
            const nextBtn = document.getElementById('lightbox-next');
            const prevBtn = document.getElementById('lightbox-prev');
            
            image.src = lightboxState.images[lightboxState.currentIndex];
            counter.textContent = lightboxState.currentIndex + 1;
            
            // Disable buttons at boundaries
            prevBtn.disabled = lightboxState.currentIndex === 0;
            nextBtn.disabled = lightboxState.currentIndex === lightboxState.images.length - 1;
        }

        function handleLightboxKeyboard(e) {
            if (document.getElementById('lightbox-modal').classList.contains('active')) {
                if (e.key === 'ArrowRight') lightboxNext();
                else if (e.key === 'ArrowLeft') lightboxPrev();
                else if (e.key === 'Escape') closeLightbox();
            }
        }

        function startDrag(e) {
            e.preventDefault();
            lightboxState.isDragging = true;
            lightboxState.startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            lightboxState.currentX = lightboxState.startX;
        }

        function dragMove(e) {
            if (!lightboxState.isDragging) return;
            e.preventDefault();
            lightboxState.currentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            
            const image = document.getElementById('lightbox-image');
            const diff = lightboxState.currentX - lightboxState.startX;
            image.style.transform = `translateX(${diff * 0.3}px)`;
        }

        function endDrag(e) {
            if (!lightboxState.isDragging) return;
            lightboxState.isDragging = false;
            
            const image = document.getElementById('lightbox-image');
            const diff = lightboxState.currentX - lightboxState.startX;
            
            // Swipe threshold: 50px
            if (diff > 50) {
                lightboxPrev();
            } else if (diff < -50) {
                lightboxNext();
            }
            
            image.style.transform = 'translateX(0)';
        }

        /* --- THEME TOGGLE --- */
        function initTheme() {
            const savedTheme = state.ui.theme || 'dark';
            const savedScheme = state.ui.colorScheme || 'amethyst';
            const savedHighlight = state.ui.highlight || 'amethyst';
            setTheme(savedTheme);
            applyColorScheme(savedScheme, savedHighlight);
            updateThemeButton();
        }

        function toggleTheme() {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
            state.ui.theme = newTheme;
            const currentScheme = state.ui.colorScheme || 'amethyst';
            const currentHighlight = state.ui.highlight || 'amethyst';
            applyColorScheme(currentScheme, currentHighlight);
            saveState();
            updateThemeButton();
            closeCustomizeModal();
        }

        function setTheme(theme) {
            if (theme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        }

        function updateThemeButton() {
            const btn = document.getElementById('theme-toggle');
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            btn.textContent = currentTheme === 'dark' ? '\ud83c\udf19' : '\ud83c\udf1e';
        }

        /* --- COLOR CUSTOMIZATION --- */
        function normalizeHexColor(hex, fallback = '#6b2fb5') {
            if (!hex || typeof hex !== 'string') return fallback;
            const c = hex.trim().toLowerCase();
            if (/^#[0-9a-f]{6}$/.test(c)) return c;
            if (/^#[0-9a-f]{3}$/.test(c)) return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
            return fallback;
        }

        function hexToRgb(hex) {
            const h = normalizeHexColor(hex);
            return { r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) };
        }

        function rgbToHex(r, g, b) {
            const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
            return `#${[clamp(r), clamp(g), clamp(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
        }

        function mixHex(a, b, ratio) {
            const x = hexToRgb(a);
            const y = hexToRgb(b);
            const t = Math.max(0, Math.min(1, ratio));
            return rgbToHex(x.r + (y.r - x.r) * t, x.g + (y.g - x.g) * t, x.b + (y.b - x.b) * t);
        }

        function getCustomScheme(baseHex, theme) {
            const base = normalizeHexColor(baseHex, '#6b2fb5');
            const rgb = hexToRgb(base);
            if (theme === 'light') {
                return {
                    bg_dark: mixHex(base, '#ffffff', 0.88),
                    bg_light: '#ffffff',
                    glass: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`,
                    glass_lighter: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`,
                    glass_border: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22)`,
                    text_main: mixHex(base, '#000000', 0.72),
                    text_muted: mixHex(base, '#444444', 0.55),
                    danger: '#c43b2f',
                    success: '#0a8f7c',
                    name: 'Custom'
                };
            }
            return {
                bg_dark: mixHex(base, '#020202', 0.92),
                bg_light: mixHex(base, '#0b0b10', 0.82),
                glass: 'rgba(255, 255, 255, 0.04)',
                glass_lighter: 'rgba(255, 255, 255, 0.08)',
                glass_border: 'rgba(255, 255, 255, 0.1)',
                text_main: '#ffffff',
                text_muted: mixHex(base, '#dddddd', 0.65),
                danger: '#ff5f5f',
                success: '#03dac6',
                name: 'Custom'
            };
        }

        const colorSchemes = {
            dark: {
                amethyst: { bg_dark: '#08040f', bg_light: '#140a22', accent: '#9d4edd', accent_glow: '#c77dff', glass: 'rgba(255, 255, 255, 0.04)', glass_lighter: 'rgba(255, 255, 255, 0.08)', glass_border: 'rgba(255, 255, 255, 0.1)', text_main: '#ffffff', text_muted: '#c8b8e0', danger: '#ff5f5f', success: '#03dac6', name: 'Amethyst' },
                sapphire: { bg_dark: '#041021', bg_light: '#0a1f3d', accent: '#2f5fd0', accent_glow: '#6f90ff', glass: 'rgba(255, 255, 255, 0.04)', glass_lighter: 'rgba(255, 255, 255, 0.08)', glass_border: 'rgba(255, 255, 255, 0.1)', text_main: '#f4f8ff', text_muted: '#a8bfdc', danger: '#ff5f5f', success: '#03dac6', name: 'Sapphire' },
                emerald: { bg_dark: '#07180f', bg_light: '#0f2d1c', accent: '#0f9d75', accent_glow: '#43c99e', glass: 'rgba(255, 255, 255, 0.04)', glass_lighter: 'rgba(255, 255, 255, 0.08)', glass_border: 'rgba(255, 255, 255, 0.1)', text_main: '#f4fff8', text_muted: '#9ccfb9', danger: '#ff6b6b', success: '#0f9d75', name: 'Emerald' },
                ruby: { bg_dark: '#1a070d', bg_light: '#34101a', accent: '#c92a4b', accent_glow: '#ef5c7a', glass: 'rgba(255, 255, 255, 0.04)', glass_lighter: 'rgba(255, 255, 255, 0.08)', glass_border: 'rgba(255, 255, 255, 0.1)', text_main: '#fff5f7', text_muted: '#e2a4b2', danger: '#ff4f72', success: '#20d09f', name: 'Ruby' },
                gold: { bg_dark: '#1a1204', bg_light: '#352308', accent: '#c9931a', accent_glow: '#e0bb55', glass: 'rgba(255, 255, 255, 0.04)', glass_lighter: 'rgba(255, 255, 255, 0.08)', glass_border: 'rgba(255, 255, 255, 0.1)', text_main: '#fff9ec', text_muted: '#e6c892', danger: '#ff6b6b', success: '#16d3a5', name: 'Gold' },
                cyan: { bg_dark: '#04161b', bg_light: '#082831', accent: '#00bcd4', accent_glow: '#4dd0e1', glass: 'rgba(255, 255, 255, 0.04)', glass_lighter: 'rgba(255, 255, 255, 0.08)', glass_border: 'rgba(255, 255, 255, 0.1)', text_main: '#effcff', text_muted: '#9fd1d8', danger: '#ff6b6b', success: '#26d09f', name: 'Cyan' },
                magenta: { bg_dark: '#140515', bg_light: '#29082a', accent: '#d100d1', accent_glow: '#f04ef0', glass: 'rgba(255, 255, 255, 0.04)', glass_lighter: 'rgba(255, 255, 255, 0.08)', glass_border: 'rgba(255, 255, 255, 0.1)', text_main: '#fff6ff', text_muted: '#dba9e1', danger: '#ff4f72', success: '#20d09f', name: 'Magenta' }
            },
            light: {
                amethyst: { bg_dark: '#f3ebff', bg_light: '#ffffff', accent: '#6f42c1', accent_glow: '#8b5dd3', glass: 'rgba(111, 66, 193, 0.08)', glass_lighter: 'rgba(111, 66, 193, 0.12)', glass_border: 'rgba(111, 66, 193, 0.2)', text_main: '#241344', text_muted: '#4f3d74', danger: '#d32f2f', success: '#00897b', name: 'Amethyst' },
                sapphire: { bg_dark: '#e8f0ff', bg_light: '#ffffff', accent: '#1d4fb8', accent_glow: '#3d6dd2', glass: 'rgba(29, 79, 184, 0.08)', glass_lighter: 'rgba(29, 79, 184, 0.12)', glass_border: 'rgba(29, 79, 184, 0.2)', text_main: '#0e2658', text_muted: '#3a5692', danger: '#d32f2f', success: '#00897b', name: 'Sapphire' },
                emerald: { bg_dark: '#e9f8f0', bg_light: '#ffffff', accent: '#0c7f5f', accent_glow: '#2d9f7f', glass: 'rgba(12, 127, 95, 0.08)', glass_lighter: 'rgba(12, 127, 95, 0.12)', glass_border: 'rgba(12, 127, 95, 0.2)', text_main: '#0f3a2a', text_muted: '#2f6b58', danger: '#d32f2f', success: '#0c7f5f', name: 'Emerald' },
                ruby: { bg_dark: '#ffeef2', bg_light: '#ffffff', accent: '#b82a49', accent_glow: '#d04867', glass: 'rgba(184, 42, 73, 0.08)', glass_lighter: 'rgba(184, 42, 73, 0.12)', glass_border: 'rgba(184, 42, 73, 0.2)', text_main: '#5a1024', text_muted: '#874058', danger: '#b82a49', success: '#0a8f7c', name: 'Ruby' },
                gold: { bg_dark: '#fff7e8', bg_light: '#ffffff', accent: '#a87406', accent_glow: '#c28e1b', glass: 'rgba(168, 116, 6, 0.08)', glass_lighter: 'rgba(168, 116, 6, 0.12)', glass_border: 'rgba(168, 116, 6, 0.2)', text_main: '#4d3205', text_muted: '#7a5b22', danger: '#c43b2f', success: '#0a8f7c', name: 'Gold' },
                cyan: { bg_dark: '#e0f7fb', bg_light: '#ffffff', accent: '#008ba3', accent_glow: '#17a7bf', glass: 'rgba(0, 139, 163, 0.08)', glass_lighter: 'rgba(0, 139, 163, 0.12)', glass_border: 'rgba(0, 139, 163, 0.2)', text_main: '#00333b', text_muted: '#1f5963', danger: '#c43b2f', success: '#0a8f7c', name: 'Cyan' },
                magenta: { bg_dark: '#ffe9ff', bg_light: '#ffffff', accent: '#b400b4', accent_glow: '#d238d2', glass: 'rgba(180, 0, 180, 0.08)', glass_lighter: 'rgba(180, 0, 180, 0.12)', glass_border: 'rgba(180, 0, 180, 0.2)', text_main: '#490449', text_muted: '#7a2b7a', danger: '#b53252', success: '#0a8f7c', name: 'Magenta' }
            }
        };

        function applyColorScheme(scheme, highlight) {
            const theme = document.documentElement.getAttribute('data-theme') || 'dark';
            const availableSchemes = Object.keys(colorSchemes[theme]);
            const safeScheme = scheme === 'custom' || availableSchemes.includes(scheme) ? scheme : 'amethyst';
            const colors = safeScheme === 'custom'
                ? getCustomScheme(state.ui.customSchemeColor || '#6b2fb5', theme)
                : colorSchemes[theme][safeScheme];
            
            // Apply base color scheme
            document.documentElement.style.setProperty('--bg-dark', colors.bg_dark);
            document.documentElement.style.setProperty('--bg-light', colors.bg_light);
            document.documentElement.style.setProperty('--glass', colors.glass);
            document.documentElement.style.setProperty('--glass-lighter', colors.glass_lighter);
            document.documentElement.style.setProperty('--glass-border', colors.glass_border);
            document.documentElement.style.setProperty('--text-main', colors.text_main);
            document.documentElement.style.setProperty('--text-muted', colors.text_muted);
            document.documentElement.style.setProperty('--danger', colors.danger);
            document.documentElement.style.setProperty('--success', colors.success);
            
            // Apply highlight colors independently
            const highlightColors = {
                amethyst: { accent: '#6b2fb5', accent_glow: '#8a4dd0' },
                sapphire: { accent: '#1d4fb8', accent_glow: '#3f73de' },
                emerald: { accent: '#0e8b66', accent_glow: '#2fb58b' },
                ruby: { accent: '#b92647', accent_glow: '#dc4c6f' },
                gold: { accent: '#b47b00', accent_glow: '#d9a62b' },
                cyan: { accent: '#008ea6', accent_glow: '#2bb2ca' },
                magenta: { accent: '#c100c1', accent_glow: '#e447e4' }
            };
            
            const highlightLight = {
                amethyst: { accent: '#5e35b1', accent_glow: '#7e57c2' },
                sapphire: { accent: '#1d4fb8', accent_glow: '#3d6dd2' },
                emerald: { accent: '#0c7f5f', accent_glow: '#2d9f7f' },
                ruby: { accent: '#a62945', accent_glow: '#c84866' },
                gold: { accent: '#9f6f08', accent_glow: '#bc8a1f' },
                cyan: { accent: '#006f85', accent_glow: '#008ba3' },
                magenta: { accent: '#a200a2', accent_glow: '#c735c7' }
            };

            const activeHighlightSet = theme === 'light' ? highlightLight : highlightColors;
            const safeHighlight = highlight === 'custom' || activeHighlightSet[highlight] ? highlight : 'amethyst';
            const activeCustom = normalizeHexColor(state.ui.customHighlightColor || '#6b2fb5', '#6b2fb5');
            const customGlow = theme === 'light' ? mixHex(activeCustom, '#ffffff', 0.25) : mixHex(activeCustom, '#ffffff', 0.18);
            const accentPair = safeHighlight === 'custom'
                ? { accent: activeCustom, accent_glow: customGlow }
                : activeHighlightSet[safeHighlight];
            document.documentElement.style.setProperty('--accent', accentPair.accent);
            document.documentElement.style.setProperty('--accent-glow', accentPair.accent_glow);

            state.ui.colorScheme = safeScheme;
            state.ui.highlight = safeHighlight;
            saveState();
            updateColorOptions();
        }

        function openCustomizeModal() {
            document.getElementById('customize-modal').classList.add('active');
            populateColorOptions();
        }

        function closeCustomizeModal() {
            document.getElementById('customize-modal').classList.remove('active');
        }

        function getSharedColorPicker() {
            if (sharedColorPicker && sharedColorPicker.parentNode) return sharedColorPicker;
            const picker = document.createElement('input');
            picker.type = 'color';
            picker.value = '#6b2fb5';
            // Keep attached for mobile Safari/Chrome reliability.
            picker.style.position = 'fixed';
            picker.style.top = '0';
            picker.style.left = '0';
            picker.style.width = '44px';
            picker.style.height = '44px';
            picker.style.opacity = '0.001';
            picker.style.border = '0';
            picker.style.padding = '0';
            picker.style.margin = '0';
            picker.style.zIndex = '-1';
            picker.setAttribute('aria-hidden', 'true');
            picker.tabIndex = -1;
            picker.addEventListener('input', () => {
                if (typeof sharedColorPickerCallback === 'function') {
                    sharedColorPickerCallback(picker.value);
                }
            });
            picker.addEventListener('change', () => {
                if (typeof sharedColorPickerCallback === 'function') {
                    sharedColorPickerCallback(picker.value);
                }
            });
            document.body.appendChild(picker);
            sharedColorPicker = picker;
            return picker;
        }

        function openNativeColorPicker(initialHex, onInput) {
            const picker = getSharedColorPicker();
            picker.value = normalizeHexColor(initialHex || '#6b2fb5', '#6b2fb5');
            sharedColorPickerCallback = typeof onInput === 'function' ? onInput : null;

            try {
                picker.focus({ preventScroll: true });
            } catch (err) {
                try { picker.focus(); } catch (_) {}
            }

            try {
                if (typeof picker.showPicker === 'function') {
                    picker.showPicker();
                    return;
                }
            } catch (err) {
                // Continue to click fallback.
            }

            try {
                picker.click();
            } catch (err) {
                // Mobile hard-fallback: ask user to retry gesture.
            }
        }

        function populateColorOptions() {
            const theme = document.documentElement.getAttribute('data-theme') || 'dark';
            const schemeContainer = document.getElementById('scheme-options');
            const highlightContainer = document.getElementById('highlight-options');
            const currentScheme = state.ui.colorScheme || 'amethyst';
            const currentHighlight = state.ui.highlight || 'amethyst';

            schemeContainer.innerHTML = '';
            highlightContainer.innerHTML = '';

            // Populate color schemes with background color swatches
            for (const [key, colors] of Object.entries(colorSchemes[theme])) {
                const schemeBtn = document.createElement('button');
                schemeBtn.className = `color-option ${currentScheme === key ? 'active' : ''}`;
                schemeBtn.title = key.charAt(0).toUpperCase() + key.slice(1);
                const swatchDiv = document.createElement('div');
                swatchDiv.className = 'color-swatch';
                swatchDiv.style.background = `linear-gradient(135deg, ${colors.bg_dark}, ${colors.bg_light})`;
                schemeBtn.appendChild(swatchDiv);
                schemeBtn.onclick = () => applyColorScheme(key, state.ui.highlight || 'amethyst');
                schemeContainer.appendChild(schemeBtn);
            }

            // Populate highlight colors with circular color swatches (independent from scheme)
            const highlightColorsDark = {
                amethyst: '#6b2fb5',
                sapphire: '#1d4fb8',
                emerald: '#0e8b66',
                ruby: '#b92647',
                gold: '#b47b00',
                cyan: '#008ea6',
                magenta: '#c100c1'
            };
            
            const highlightColorsLight = {
                amethyst: '#5e35b1',
                sapphire: '#1d4fb8',
                emerald: '#0c7f5f',
                ruby: '#a62945',
                gold: '#9f6f08',
                cyan: '#006f85',
                magenta: '#a200a2'
            };
            
            const highlightSet = theme === 'light' ? highlightColorsLight : highlightColorsDark;

            for (const [key, color] of Object.entries(highlightSet)) {
                const highlightBtn = document.createElement('button');
                highlightBtn.className = `color-option ${currentHighlight === key ? 'active' : ''}`;
                highlightBtn.title = key.charAt(0).toUpperCase() + key.slice(1);
                const swatchDiv = document.createElement('div');
                swatchDiv.className = 'color-swatch';
                swatchDiv.style.background = color;
                highlightBtn.appendChild(swatchDiv);
                highlightBtn.onclick = () => applyColorScheme(state.ui.colorScheme || 'amethyst', key);
                highlightContainer.appendChild(highlightBtn);
            }

            const customSchemeBtn = document.createElement('button');
            customSchemeBtn.className = `color-option ${currentScheme === 'custom' ? 'active' : ''}`;
            customSchemeBtn.title = 'Custom';
            const customSchemeSwatch = document.createElement('div');
            customSchemeSwatch.className = 'color-swatch';
            customSchemeSwatch.style.background = normalizeHexColor(state.ui.customSchemeColor || '#6b2fb5', '#6b2fb5');
            customSchemeBtn.appendChild(customSchemeSwatch);
            customSchemeBtn.onclick = () => {
                openNativeColorPicker(state.ui.customSchemeColor || '#6b2fb5', (pickedHex) => {
                    state.ui.customSchemeColor = normalizeHexColor(pickedHex, '#6b2fb5');
                    customSchemeSwatch.style.background = state.ui.customSchemeColor;
                    state.ui.colorScheme = 'custom';
                    applyColorScheme('custom', state.ui.highlight || 'amethyst');
                });
            };
            schemeContainer.appendChild(customSchemeBtn);

            const customHighlightBtn = document.createElement('button');
            customHighlightBtn.className = `color-option ${currentHighlight === 'custom' ? 'active' : ''}`;
            customHighlightBtn.title = 'Custom';
            const customHighlightSwatch = document.createElement('div');
            customHighlightSwatch.className = 'color-swatch';
            customHighlightSwatch.style.background = normalizeHexColor(state.ui.customHighlightColor || '#6b2fb5', '#6b2fb5');
            customHighlightBtn.appendChild(customHighlightSwatch);
            customHighlightBtn.onclick = () => {
                openNativeColorPicker(state.ui.customHighlightColor || '#6b2fb5', (pickedHex) => {
                    state.ui.customHighlightColor = normalizeHexColor(pickedHex, '#6b2fb5');
                    customHighlightSwatch.style.background = state.ui.customHighlightColor;
                    state.ui.highlight = 'custom';
                    applyColorScheme(state.ui.colorScheme || 'amethyst', 'custom');
                });
            };
            highlightContainer.appendChild(customHighlightBtn);
        }

        function updateColorOptions() {
            const theme = document.documentElement.getAttribute('data-theme') || 'dark';
            const currentScheme = state.ui.colorScheme || 'amethyst';
            const currentHighlight = state.ui.highlight || 'amethyst';
            const schemeContainer = document.getElementById('scheme-options');
            const highlightContainer = document.getElementById('highlight-options');
            
            // Update scheme options
            if (schemeContainer) {
                const schemeButtons = schemeContainer.querySelectorAll('.color-option');
                const schemeKeys = Object.keys(colorSchemes[theme]);
                schemeButtons.forEach((btn, idx) => {
                    btn.classList.remove('active');
                    if (idx < schemeKeys.length && schemeKeys[idx] === currentScheme) {
                        btn.classList.add('active');
                    }
                });
            }

            // Update highlight options
            if (highlightContainer) {
                const highlightButtons = highlightContainer.querySelectorAll('.color-option');
                const highlightPalette = theme === 'light' ? {
                    amethyst: '#5e35b1',
                    sapphire: '#1d4fb8',
                    emerald: '#0c7f5f',
                    ruby: '#a62945',
                    gold: '#9f6f08',
                    cyan: '#006f85',
                    magenta: '#a200a2'
                } : {
                    amethyst: '#6b2fb5',
                    sapphire: '#1d4fb8',
                    emerald: '#0e8b66',
                    ruby: '#b92647',
                    gold: '#b47b00',
                    cyan: '#008ea6',
                    magenta: '#c100c1'
                };
                const highlightKeys = [...Object.keys(highlightPalette), 'custom'];
                highlightButtons.forEach((btn, idx) => {
                    btn.classList.remove('active');
                    if (idx < highlightKeys.length && highlightKeys[idx] === currentHighlight) {
                        btn.classList.add('active');
                    }
                });
            }

            if (schemeContainer) {
                const schemeButtons = schemeContainer.querySelectorAll('.color-option');
                const schemeKeys = [...Object.keys(colorSchemes[theme]), 'custom'];
                schemeButtons.forEach((btn, idx) => {
                    if (idx < schemeKeys.length && schemeKeys[idx] === currentScheme) {
                        btn.classList.add('active');
                    }
                });
            }
        }

        // Defer service worker registration and notification prompt until full page load
        window.addEventListener('load', () => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(reg => logAdmin('Service Worker registered on load.'))
                    .catch(err => logAdmin('Service Worker registration failed: ' + (err && err.message ? err.message : err)));
            }

            // Non-blocking notification permission request after a short delay
            setTimeout(() => {
                if ('Notification' in window && Notification.permission === 'default') {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') logAdmin('Notifications enabled.');
                    }).catch(err => logAdmin('Notification permission request failed: ' + err));
                }
            }, 2000);
        });

        applyBootProfileToDom();
        init();




