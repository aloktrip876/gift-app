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
            // CHEST 1: WARM MESSAGE (Type: letter)
            { 
                id: 1, 
                type: "text", 
                icon: "💖", 
                label: "Just for You", 
                content: "Hey, Shreya\n\"You have this incredible magic of making everything okay just by smiling. I wanted to create something that might give a little bit of that joy back to you. You are amazing, inside and out.\nThank you for being someone whose presence feels warm, gentle, and so reassuring.\nI hope this year brings you the same happiness you quietly bring to everyone around you.\nYou're special — more than you know.\n\nWith love,\nAlok" 
            },

            // CHEST 2: SPECIAL IMAGE (Type: wallpaper)
            { 
                id: 2, 
                type: "wallpaper", 
                icon: "📸", 
                label: "A Special Image", 
                content: "images/special_wallpaper.png"
            },

            // CHEST 3: SPOTIFY PLAYLIST (Type: playlist)
            { 
                id: 3, 
                type: "playlist", 
                icon: "🎧", 
                label: "Songs Just for You", 
                content: `
                    <iframe data-testid="embed-iframe" style="border-radius:12px" src="https://open.spotify.com/embed/playlist/4lSF5XemjVqs3M3Sk87WBX?utm_source=generator" width="100%" height="352" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
                `
            },

            // CHEST 4: POETRY DESCRIBING HER (Type: text)
            { 
                id: 4, 
                type: "text", 
                icon: "📜", 
                label: "A Poem for My Muse", 
                content: `
                    Shreya, a friendship as rare and as true,
                    Is something I treasure, thanks entirely to you.
                    You're kindness embodied, a generous soul,
                    A sweet, helpful spirit that makes others whole.

                    You move through the world with an affable grace,
                    A bright, open smile that lights up the space.
                    So intelligent, hardworking, and sharp in your mind,
                    The very best version of thoughtful and kind.

                    But sometimes, I notice that mind takes a flight,
                    Exploring the shadows instead of the light.
                    That beautiful brain, which knows so much,
                    Can worry too much, with a hesitant touch.

                    Remember, my friend, when the thoughts start to spin,
                    You're stronger than any doubt held deep within.
                    The world sees your goodness, your warmth, and your worth,
                    The most wonderful friend on this whole spinning earth.

                    So keep shining brightly, keep being so clever,
                    And know that my friendship is solid forever.
                    No need to overthink what a treasure you are,
                    You’re simply perfect, my shining bright star. ❤️` 
            },

            // CHEST 5: RIDDLE QUIZ (Type: link)
            { 
                id: 5, 
                type: "link", 
                icon: "❓", 
                label: "Riddle Challenge", 
                content: "https://forms.gle/NBTgCCP35bWiU7wAA" 
            },

            // CHEST 6: COLLAGE OF MEMORIES (Type: gallery)
            { 
                id: 6, 
                type: "gallery", 
                icon: "🖼️", 
                label: "Memory Collage", 
                content: [
                    "images/gallery (1).jpg",
                    "images/gallery (2).jpg",
                    "images/gallery (3).jpg",
                    "images/gallery (4).jpg"
                ] 
            },

            // CHEST 7: JOKE + BONUS KEY (Type: bonus_key)
            { 
                id: 7, 
                type: "bonus_key", 
                icon: "😂", 
                label: "A Chuckle & A Skip", 
                content: {
                    joke: `एक लड़के ने एक लड़की को कमाल का फूल दिया?
                            लड़की ने उसको एक थप्पड़ मार दिया,
                            लड़का बोला मैं तो बीजेपी का प्रचार कर रहा हूं,
                            लड़की बोली में भी कांग्रेस का प्रचार कर रही हूं।
                            -----------------------------------
                            लड़का: चलते चलते यूंही रुक जाता हूं मैं
                            बेठे-बेठे यूंही खो जाता हूं मैं
                            क्या ये ही प्यार है. . .???
                            लड़की: नहीं ये कमज़ोरी है
                            सुभा शाम ग्लूकोज पिया करो। . .
                            -----------------------------------
                            सरदार की शायरी-
                            “एक लड़की को देखा तो ऐसा लगा,
                            दूसरी लड़की को देखा तो वैसा लगा,
                            पर दोनों ने थप्पड़ मारा तो एक जैसा लगा"
                            -----------------------------------
                            पति: सम्मोहन क्या है?
                            पत्नी: किसी को अपने वश में
                            कर के उससे मन चाहा काम
                            करवाना.
                            पति: अरे नहीं इसे तो शादी
                            कहते हैं|
                            -----------------------------------
                            पति: तुमसे शादी करके मुझे एक बहुत बड़ा फ़ायदा हुआ।
                            पत्नी: कौन सा फ़ायदा?
                            पति: मुझे मेरे गुनाहों की सजा-जीते-जी ही मिल गई|
                            -----------------------------------
                            लड़की: आज मेरे पापा ने मुझे
                            तुम्हारे साथ बाइक पर जाते हुए देखा..
                            BF: फ़िर ?
                            लड़की: फिर क्या,
                            मुझसे बस के पैसे वापस ले लिए..!!
                            -----------------------------------
                            पति: जज साहब मुझे तलाक चाहिए,
                            मेरी बीवी ने 1 साल से मुझसे बात नहीं की,
                            जज: फिर सोच लो,
                            ऐसी बीवी किस्मत वालों को मिलती है।
                            -----------------------------------
                            सर: टेंस कितने टाइप के होते हैं?
                            लड़का: 3, वर्तमान, भूत, भविष्य
                            सर: गुड
                            उदाहरण दें,
                            लड़का:कल आपकी बेटी को देखा था,
                            आज प्यार करता हूँ,
                            कल भागा के ले जाऊंगा|
                            ------------------------------------
                            टीचर: अगर कोई मोटी लड़की पलट के वापस आ जाए तो,
                            क्या वाक्य को अंग्रेजी में क्या कहेंगे?
                            पप्पू: "गोल माल रिटर्न्स!"
                            ------------------------------------
                            पता नहीं लोग पहली नजर में ही...
                            सच्चा प्यार कैसे ढूंढ लेते हैं...
                            यहां तो आधे घंटे तक...
                            सेल्लो टेप का किनारा ही नहीं मिल पाता...!!!`, 
                    targetChestId: 8 
                }
            },
            
            // CHEST 8: ANY ONE WISH FROM ME (Type: text)
            { 
                id: 8, 
                type: "text", 
                icon: "🧞", 
                label: "Your Wish is My Command", 
                content: "Consider this your own personal genie moment, Miss Tripathi. My heart (and this magical chest!) is ready to grant you one wish—anything reasonable that I can fulfill. Let me know(Whatsapp me) what your heart desires! 🥰" 
            },

            // CHEST 9: A COLLECTION OF RELATABLE MEMES (Type: gallery)
            { 
                id: 9, 
                type: "gallery", 
                icon: "🤪", 
                label: "A Collection of Hilarious Memes", 
                content: [
                    "images/meme (1).jpg",
                    "images/meme (2).jpg",
                    "images/meme (3).jpg",
                    "images/meme (4).jpg",
                    "images/meme (5).jpg",
                    "images/meme (6).jpg"
                ]
            },
            
            // CHEST 10: PUZZLE GAME (Type: puzzle - FINAL)
            { 
                id: 10, 
                type: "puzzle", 
                icon: "🧩", 
                label: "The Grand Finale Puzzle", 
                content: {
                    imageUrl: "data:image/jpeg;base64,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", 
                    size: 3 
                }
            } 
        ];

        /* --- STATE --- */
        let CHEST_DATA = JSON.parse(JSON.stringify(DEFAULT_CHEST_DATA));
        const API_STATE_URL = '/api/state';
        const API_RESET_URL = '/api/reset';
        const API_AUTH_LOGIN_URL = '/api/auth/login';
        const API_AUTH_SESSION_URL = '/api/auth/session';
        const API_AUTH_LOGOUT_URL = '/api/auth/logout';
        const API_AUTH_HEARTBEAT_URL = '/api/auth/heartbeat';
        const API_ADMIN_USERS_URL = '/api/admin/users';
        const API_ADMIN_ANALYTICS_URL = '/api/admin/analytics';
        const API_ADMIN_ANALYTICS_CSV_URL = '/api/admin/analytics/sessions.csv';

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
        let heartbeatInterval = null;
        const analyticsState = {
            rows: [],
            page: 1,
            pageSize: 12
        };

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

            const title = profile.pageTitle || (user && user.pageTitle) || document.title;
            const subtitle = profile.headerSubtitle || "A digital journey of surprises, unlocked one key at a time.";
            const headerTitle = profile.headerTitle || title;

            document.title = title;
            const h1 = document.querySelector('header h1');
            const p = document.querySelector('header p');
            if (h1) h1.textContent = headerTitle;
            if (p) p.textContent = subtitle;

            const userInfo = document.getElementById('user-session-info');
            const userName = document.getElementById('session-user-name');
            const logoutBtn = document.getElementById('logout-btn');
            if (userInfo && userName && user) {
                userInfo.style.display = 'block';
                userName.textContent = user.name || user.userId || 'User';
            }
            if (logoutBtn) logoutBtn.style.display = user ? 'flex' : 'none';
        }

        async function checkSession() {
            const res = await fetch(API_AUTH_SESSION_URL, { method: 'GET', credentials: 'include' });
            if (!res.ok) return null;
            const data = await res.json();
            if (!data || !data.authenticated) return null;
            return data.user || null;
        }

        async function ensureAuthenticated() {
            const user = await checkSession();
            if (user) {
                applyUserPersonalization(user);
                document.getElementById('login-modal').classList.remove('active');
                setLoginStatus('');
                return true;
            }
            applyUserPersonalization(null);
            document.getElementById('login-modal').classList.add('active');
            setLoginStatus('Verify your identity to continue.');
            return false;
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
                    if (typeof data.attemptsLeft === 'number') {
                        loginAttempts = Math.max(0, 3 - data.attemptsLeft);
                    } else {
                        loginAttempts += 1;
                    }
                    localStorage.setItem('gift_login_attempts', String(loginAttempts));
                    if (res.status === 429 || data.retryAfterSec) {
                        setLoginStatus(`Locked. Retry after ${data.retryAfterSec || 0}s. ${data.lockUntilIst ? `Unlocks at ${data.lockUntilIst}` : ''}`, true);
                    } else {
                        setLoginStatus(data.error || 'Verification failed.', true);
                    }
                    return;
                }
                loginAttempts = 0;
                localStorage.setItem('gift_login_attempts', '0');
                applyUserPersonalization(data.user || null);
                document.getElementById('login-modal').classList.remove('active');
                await init();
            } catch (err) {
                loginAttempts += 1;
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
            if (!currentUser) {
                const ok = await ensureAuthenticated();
                if (!ok) return;
            }
            await loadState();
            initTheme();
            
            if (state.chests.length === 0 || state.chests.length !== TOTAL_CHESTS) {
                state.chests = CHEST_DATA.map(c => ({
                    id: c.id, isLocked: true, key: null, unlockedAt: null
                }));
                saveState();
            }

            if (!state.tutorialSeen) {
                document.getElementById('tutorial-modal').classList.add('active');
            }

            requestNotificationPermission();
            checkKeyGeneration();
            renderChests();
            updateSidebar();
            
            setInterval(updateTimer, 1000);
            updateTimer(); 
            
            // Setup RESTART listener
            const restartInput = document.getElementById('restart-input');
            if (restartInput) {
                restartInput.addEventListener('input', checkRestartInput);
            }

            logAdmin("System initialized.");
            
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
                }
            });

            if (heartbeatInterval) clearInterval(heartbeatInterval);
            heartbeatInterval = setInterval(heartbeat, 60000);
        }
        
        /* --- FINAL PAGE RESTART LOGIC --- */
        function checkRestartInput(e) {
            if (e.target.value.toUpperCase() === RESTART_KEYWORD) {
                e.target.value = ''; // Clear input immediately
                adminResetAll();
            }
        }
        
        /* --- FEEDBACK LOGIC --- */
        function sendFeedback(type) {

            state.feedbackSent = {
                type,
                at: Date.now()
            };
            saveState();

            const messageEl = document.getElementById('feedback-message');
            const likeBtn = document.getElementById('feedback-like');
            const dislikeBtn = document.getElementById('feedback-dislike');
            
            if (type === 'like') {
                messageEl.innerText = "Thank you! I'm so glad you enjoyed it! ❤️";
                likeBtn.classList.add('disabled');
            } else {
                messageEl.innerText = "I hear you! I'll try to do better next time. Thank you for the honest feedback. 😊";
                dislikeBtn.classList.add('disabled');
            }

            likeBtn.classList.add('disabled');
            dislikeBtn.classList.add('disabled');

            logAdmin(`Feedback sent: ${type}`);
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
                btn.innerText = '✓ Complete - Click to Confirm';
            } else {
                btn.style.background = '';
                btn.innerText = 'Done';
            }
        }

        function handlePuzzleDone() {
            const isSolved = puzzleTiles.every((val, index) => val === index);
            if (!isSolved) {
                alert('❌ Puzzle is not yet solved. Keep trying!');
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
                messageEl.innerText = "✨ Puzzle Solved! ✨";
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
                    navigator.serviceWorker.register('sw.js', { scope: './' })
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
                        title: '✨ New Key Generated!',
                        body: `A new key is ready to unlock Chest #${chestId}! Check the sidebar now.`
                    });
                } else {
                    // Fallback for browsers without Service Worker support
                    const options = {
                        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="70" font-size="80" text-anchor="middle">🔑</text></svg>',
                        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="70" font-size="80" text-anchor="middle">🔑</text></svg>',
                        tag: 'key-notification-' + chestId,
                        requireInteraction: true
                    };
                    const notification = new Notification(`✨ New Key Generated!`, {
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
                bonusKeyMsg.innerText = "❌ Key already pending. Use it first!"; 
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
                if(confirm("🚨 WARNING: This will erase ALL progress. Proceed?")) {
                    adminResetAll(); return;
                }
            }

            const chest = state.chests.find(c => c.id === id);
            
            if (!state.pendingKey) { alert("❌ No key is currently active."); return; }
            if (state.pendingKey.targetChestId !== id) { alert("❌ This key does not fit this chest."); return; }
            if (!state.pendingKey.isRevealed) { alert("🔒 You must scratch the card first!"); return; }
            if (userKey !== state.pendingKey.code) { alert("❌ Invalid Key."); return; }

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
        function getGiftHTML(type, content, chestId) { 
            let html = '';
            switch(type) {
                case 'letter': case 'text': case 'coupon': html = `<p class="gift-text">${content}</p>`; break;
                case 'gallery':
                    html = '<div class="gift-gallery">';
                    content.forEach((url, idx) => {
                        const cls = (chestId === 6) ? 'chest6-img' : '';
                        const usesLightbox = chestId === 6 || chestId === 9;
                        if (chestId === 6) {
                            html += `<span class="chest6-img-wrap"><img src="${url}" class="${cls}" onclick="openLightbox(${idx}, ${JSON.stringify(content).replace(/"/g, '&quot;')})"></span>`;
                        } else if (usesLightbox) {
                            html += `<img src="${url}" class="${cls}" onclick="openLightbox(${idx}, ${JSON.stringify(content).replace(/"/g, '&quot;')})">`;
                        } else {
                            html += `<img src="${url}" class="${cls}" onclick="window.open('${url}','_blank')">`;
                        }
                    });
                    html += '</div>';
                    break;
                case 'playlist': html = content; break;
                case 'video': html = `<div class="media-wrapper"><iframe src="${content}" allowfullscreen></iframe></div>`; break;
                case 'wallpaper':
                    html = `<div class="gift-wallpaper"><img src="${content}" alt="Wallpaper" width="100%" style="border-radius:5px; border:2px solid black; cursor:pointer;" onclick="openLightbox(0, ${JSON.stringify([content]).replace(/"/g, '&quot;')})"><a href="${content}" target="_blank" class="btn btn-download" style="width:100%">Download High-Res</a></div>`;
                    break;
                case 'link': html = `<a href="${content}" target="_blank" class="gift-link-card">CLICK TO OPEN GIFT ↗</a>`; break;
                
                case 'bonus_key': {
                    const nextLockedChest = state.chests.find(c => c.isLocked);
                    const targetId = nextLockedChest ? nextLockedChest.id : 'N/A';
                    const chestState = state.chests.find(c => c.id === chestId) || {};
                    const alreadyUsed = !!chestState.bonusUsed;

                    const btnDisplay = (state.pendingKey || alreadyUsed) ? 'none' : 'block';
                    const usedMsg = alreadyUsed ? '<p style="margin-top:10px; font-size:0.9rem; color:var(--text-muted);">Bonus used.</p>' : '';

                    html = `
                        <p class="gift-text">${content.joke}</p>
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
                    break;
                
                default: html = `<p>${content}</p>`;
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
                        <div class="chest-icon">🔒</div>
                        <div class="chest-title">Chest #${chestState.id}</div>
                        <p style="font-size: 0.8rem; color: #888; margin-bottom: 0.5rem;">Locked — Needs Key</p>
                        <div class="input-group">
                            <input type="text" id="input-${chestState.id}" class="chest-input" placeholder="XXXX-XXXXXX">
                            <button class="btn btn-sm" onclick="unlockChest(${chestState.id})">🔓</button>
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
                    sendFeedback(typeof state.feedbackSent === 'string' ? state.feedbackSent : state.feedbackSent.type);
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

        function saveState() {
            if (!currentUser) return Promise.resolve();
            const snapshot = JSON.parse(JSON.stringify(state));
            writeStateCache(snapshot);
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

        async function loadState() {
            try {
                const res = await fetch(API_STATE_URL, {
                    method: 'GET',
                    credentials: 'include'
                });
                if (res.status === 401) {
                    await ensureAuthenticated();
                    throw new Error('Not authenticated');
                }
                if (!res.ok) throw new Error(`State load failed: ${res.status}`);
                const data = await res.json();
                state = hydrateState(data.state);
                writeStateCache(state);
                if (data && data.user) applyUserPersonalization(data.user);
            } catch (err) {
                console.error(err);
                const cached = readStateCache();
                state = cached ? hydrateState(cached) : createDefaultState();
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
            
            const particles = Array.from({length: 150}, () => ({
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
            if(confirm("🚨 WARNING: This will erase ALL progress and restart the entire experience. Proceed?")) {
                resetStateOnServer()
                    .then((res) => {
                        if (!res.ok) throw new Error('Reset failed');
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
            btn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
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
                const picker = document.createElement('input');
                picker.type = 'color';
                picker.value = normalizeHexColor(state.ui.customSchemeColor || '#6b2fb5', '#6b2fb5');
                picker.style.position = 'fixed';
                picker.style.left = '-9999px';
                document.body.appendChild(picker);
                picker.addEventListener('input', () => {
                    state.ui.customSchemeColor = normalizeHexColor(picker.value, '#6b2fb5');
                    customSchemeSwatch.style.background = state.ui.customSchemeColor;
                    state.ui.colorScheme = 'custom';
                    applyColorScheme('custom', state.ui.highlight || 'amethyst');
                });
                picker.addEventListener('change', () => picker.remove());
                picker.click();
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
                const picker = document.createElement('input');
                picker.type = 'color';
                picker.value = normalizeHexColor(state.ui.customHighlightColor || '#6b2fb5', '#6b2fb5');
                picker.style.position = 'fixed';
                picker.style.left = '-9999px';
                document.body.appendChild(picker);
                picker.addEventListener('input', () => {
                    state.ui.customHighlightColor = normalizeHexColor(picker.value, '#6b2fb5');
                    customHighlightSwatch.style.background = state.ui.customHighlightColor;
                    state.ui.highlight = 'custom';
                    applyColorScheme(state.ui.colorScheme || 'amethyst', 'custom');
                });
                picker.addEventListener('change', () => picker.remove());
                picker.click();
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

        init();


