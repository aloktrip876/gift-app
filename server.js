const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const PORT = process.env.PORT || 3000;
const ROOT = process.cwd();
const DATA_DIR = process.env.DATA_DIR
    ? path.resolve(ROOT, process.env.DATA_DIR)
    : path.join(ROOT, "data");
const DB_FILE = process.env.DB_FILE
    ? path.resolve(ROOT, process.env.DB_FILE)
    : path.join(DATA_DIR, "app.db");
const CLIENT_COOKIE = "gift_client_id";
const ADMIN_KEY = process.env.ADMIN_KEY || "";
const GSHEET_SYNC_ENABLED = process.env.GSHEET_SYNC_ENABLED === "true";
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || "";
const GOOGLE_SHEET_TAB = process.env.GOOGLE_SHEET_TAB || "States";
const GOOGLE_SERVICE_ACCOUNT_KEY_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || "";
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n");

function resolveServiceAccountCredentials() {
    if (GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
        try {
            const raw = fs.readFileSync(path.resolve(ROOT, GOOGLE_SERVICE_ACCOUNT_KEY_FILE), "utf8");
            const json = JSON.parse(raw);
            return {
                email: json.client_email || "",
                privateKey: (json.private_key || "").replace(/\\n/g, "\n")
            };
        } catch (err) {
            console.error("Failed reading GOOGLE_SERVICE_ACCOUNT_KEY_FILE:", err.message || err);
            return { email: "", privateKey: "" };
        }
    }

    return {
        email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        privateKey: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    };
}

const SERVICE_ACCOUNT = resolveServiceAccountCredentials();

function defaultState() {
    return {
        chests: [],
        pendingKey: null,
        lastGenerationTime: 0,
        tutorialSeen: false,
        adminHistory: [],
        puzzleState: null,
        feedbackSent: null,
        ui: {
            theme: "dark",
            colorScheme: "purple",
            highlight: "purple"
        }
    };
}

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

ensureDataDir();
const db = new DatabaseSync(DB_FILE);
db.exec(`
    CREATE TABLE IF NOT EXISTS client_state (
        client_id TEXT PRIMARY KEY,
        state_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
    )
`);

const getStateStmt = db.prepare("SELECT state_json FROM client_state WHERE client_id = ?");
const listStatesStmt = db.prepare("SELECT client_id, updated_at, state_json FROM client_state ORDER BY updated_at DESC");
const upsertStateStmt = db.prepare(`
    INSERT INTO client_state (client_id, state_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(client_id) DO UPDATE SET
        state_json = excluded.state_json,
        updated_at = excluded.updated_at
`);

function getClientState(clientId) {
    const row = getStateStmt.get(clientId);
    if (!row) return null;
    try {
        return JSON.parse(row.state_json);
    } catch (err) {
        return null;
    }
}

function saveClientState(clientId, nextState) {
    upsertStateStmt.run(clientId, JSON.stringify(nextState), Date.now());
    queueGoogleSheetSync();
}

function parseAdminKey(req, url) {
    const headerKey = req.headers["x-admin-key"];
    const queryKey = url.searchParams.get("key");
    return (typeof headerKey === "string" && headerKey) || queryKey || "";
}

function parseCookies(req) {
    const header = req.headers.cookie || "";
    const entries = header.split(";").map((v) => v.trim()).filter(Boolean);
    const cookies = {};
    for (const entry of entries) {
        const idx = entry.indexOf("=");
        if (idx === -1) continue;
        const k = entry.slice(0, idx);
        const v = entry.slice(idx + 1);
        cookies[k] = decodeURIComponent(v);
    }
    return cookies;
}

function getClientId(req, res) {
    const cookies = parseCookies(req);
    let clientId = cookies[CLIENT_COOKIE];
    if (!clientId || !/^[a-zA-Z0-9-]{16,}$/.test(clientId)) {
        clientId = crypto.randomUUID();
        res.setHeader("Set-Cookie", `${CLIENT_COOKIE}=${encodeURIComponent(clientId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`);
    }
    return clientId;
}

function sendJson(res, statusCode, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body)
    });
    res.end(body);
}

function sendCsv(res, statusCode, csvBody, filename = "states.csv") {
    res.writeHead(statusCode, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": Buffer.byteLength(csvBody)
    });
    res.end(csvBody);
}

function readBody(req, maxBytes = 1024 * 1024) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        req.on("data", (chunk) => {
            size += chunk.length;
            if (size > maxBytes) {
                reject(new Error("Payload too large"));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        req.on("error", reject);
    });
}

function withStateDefaults(state) {
    const base = defaultState();
    const incoming = state && typeof state === "object" ? state : {};
    return {
        ...base,
        ...incoming,
        ui: {
            ...base.ui,
            ...(incoming.ui && typeof incoming.ui === "object" ? incoming.ui : {})
        }
    };
}

function parseState(row) {
    try {
        return withStateDefaults(JSON.parse(row.state_json));
    } catch (err) {
        return withStateDefaults(null);
    }
}

function toIso(ms) {
    if (!ms || Number.isNaN(Number(ms))) return "";
    try {
        return new Date(Number(ms)).toISOString();
    } catch (err) {
        return "";
    }
}

function csvEscape(value) {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, "\"\"")}"`;
    }
    return str;
}

function buildStatesTable(rows) {
    const headers = [
        "client_id",
        "updated_at_ms",
        "updated_at_iso",
        "tutorial_seen",
        "unlocked_count",
        "total_chests",
        "pending_key_code",
        "pending_key_target_chest",
        "pending_key_revealed",
        "last_generation_time_ms",
        "last_generation_time_iso",
        "feedback_sent",
        "theme",
        "color_scheme",
        "highlight",
        "admin_history_count",
        "has_puzzle_state",
        "state_json"
    ];

    const dataRows = [];
    for (const row of rows) {
        const state = parseState(row);
        const unlockedCount = Array.isArray(state.chests) ? state.chests.filter((c) => c && c.isLocked === false).length : 0;
        const totalChests = Array.isArray(state.chests) ? state.chests.length : 0;
        const values = [
            row.client_id,
            row.updated_at,
            toIso(row.updated_at),
            state.tutorialSeen,
            unlockedCount,
            totalChests,
            state.pendingKey ? state.pendingKey.code || "" : "",
            state.pendingKey ? state.pendingKey.targetChestId || "" : "",
            state.pendingKey ? !!state.pendingKey.isRevealed : "",
            state.lastGenerationTime || "",
            toIso(state.lastGenerationTime),
            state.feedbackSent || "",
            state.ui && state.ui.theme ? state.ui.theme : "",
            state.ui && state.ui.colorScheme ? state.ui.colorScheme : "",
            state.ui && state.ui.highlight ? state.ui.highlight : "",
            Array.isArray(state.adminHistory) ? state.adminHistory.length : 0,
            !!state.puzzleState,
            JSON.stringify(state)
        ];
        dataRows.push(values);
    }
    return { headers, rows: dataRows };
}

function buildStatesCsv(rows) {
    const table = buildStatesTable(rows);
    const lines = [table.headers.map(csvEscape).join(",")];
    for (const row of table.rows) {
        lines.push(row.map(csvEscape).join(","));
    }
    return `${lines.join("\n")}\n`;
}

let sheetsSyncQueue = Promise.resolve();
let sheetsClientPromise = null;

function canSyncToGoogleSheets() {
    return GSHEET_SYNC_ENABLED
        && !!GOOGLE_SHEET_ID
        && !!SERVICE_ACCOUNT.email
        && !!SERVICE_ACCOUNT.privateKey;
}

async function getSheetsClient() {
    if (!canSyncToGoogleSheets()) return null;
    if (sheetsClientPromise) return sheetsClientPromise;
    sheetsClientPromise = (async () => {
        const { google } = require("googleapis");
        const auth = new google.auth.JWT({
            email: SERVICE_ACCOUNT.email,
            key: SERVICE_ACCOUNT.privateKey,
            scopes: ["https://www.googleapis.com/auth/spreadsheets"]
        });
        return google.sheets({ version: "v4", auth });
    })();
    return sheetsClientPromise;
}

async function syncStatesToGoogleSheet() {
    if (!canSyncToGoogleSheets()) {
        return { ok: false, skipped: true, reason: "Google Sheets sync not configured" };
    }

    const sheets = await getSheetsClient();
    const table = buildStatesTable(listStatesStmt.all());
    const values = [table.headers, ...table.rows];
    const tabName = GOOGLE_SHEET_TAB;
    const range = `${tabName}!A1`;

    const meta = await sheets.spreadsheets.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        fields: "sheets.properties.title"
    });
    const existingTitles = (meta.data.sheets || [])
        .map((s) => s && s.properties ? s.properties.title : null)
        .filter(Boolean);

    if (!existingTitles.includes(tabName)) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: GOOGLE_SHEET_ID,
            requestBody: {
                requests: [
                    { addSheet: { properties: { title: tabName } } }
                ]
            }
        });
    }

    await sheets.spreadsheets.values.clear({
        spreadsheetId: GOOGLE_SHEET_ID,
        range
    });

    await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range,
        valueInputOption: "RAW",
        requestBody: { values }
    });

    return { ok: true, syncedRows: table.rows.length };
}

function queueGoogleSheetSync() {
    sheetsSyncQueue = sheetsSyncQueue
        .then(() => syncStatesToGoogleSheet())
        .catch((err) => {
            console.error("Google Sheets sync failed:", err.message || err);
        });
    return sheetsSyncQueue;
}

function contentTypeFor(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case ".html": return "text/html; charset=utf-8";
        case ".css": return "text/css; charset=utf-8";
        case ".js": return "application/javascript; charset=utf-8";
        case ".json": return "application/json; charset=utf-8";
        case ".jpg":
        case ".jpeg": return "image/jpeg";
        case ".png": return "image/png";
        case ".gif": return "image/gif";
        case ".svg": return "image/svg+xml";
        case ".ico": return "image/x-icon";
        case ".webp": return "image/webp";
        case ".txt": return "text/plain; charset=utf-8";
        default: return "application/octet-stream";
    }
}

function serveStatic(req, res, pathname) {
    const safePath = pathname === "/" ? "/index.html" : pathname;
    const filePath = path.resolve(path.join(ROOT, safePath.replace(/^\/+/, "")));
    if (!filePath.startsWith(path.resolve(ROOT))) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Not found");
            return;
        }
        res.writeHead(200, { "Content-Type": contentTypeFor(filePath) });
        fs.createReadStream(filePath).pipe(res);
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === "/api/state" && req.method === "GET") {
        const clientId = getClientId(req, res);
        const saved = getClientState(clientId);
        const current = withStateDefaults(saved);
        if (!saved) {
            saveClientState(clientId, current);
        }
        sendJson(res, 200, { state: current });
        return;
    }

    if (pathname === "/api/state" && req.method === "POST") {
        try {
            const clientId = getClientId(req, res);
            const raw = await readBody(req);
            const parsed = raw ? JSON.parse(raw) : {};
            const nextState = withStateDefaults(parsed.state);
            saveClientState(clientId, nextState);

            sendJson(res, 200, { ok: true });
        } catch (err) {
            sendJson(res, 400, { ok: false, error: "Invalid request body" });
        }
        return;
    }

    if (pathname === "/api/reset" && req.method === "POST") {
        const clientId = getClientId(req, res);
        saveClientState(clientId, defaultState());
        sendJson(res, 200, { ok: true });
        return;
    }

    if (pathname === "/api/admin/states" && req.method === "GET") {
        if (ADMIN_KEY) {
            const provided = parseAdminKey(req, url);
            if (provided !== ADMIN_KEY) {
                sendJson(res, 401, { ok: false, error: "Unauthorized" });
                return;
            }
        }

        const rows = listStatesStmt.all().map((row) => {
            let parsedState = null;
            try {
                parsedState = JSON.parse(row.state_json);
            } catch (err) {
                parsedState = null;
            }
            return {
                clientId: row.client_id,
                updatedAt: row.updated_at,
                state: parsedState
            };
        });

        sendJson(res, 200, {
            ok: true,
            count: rows.length,
            clients: rows
        });
        return;
    }

    if (pathname === "/api/admin/states.csv" && req.method === "GET") {
        if (ADMIN_KEY) {
            const provided = parseAdminKey(req, url);
            if (provided !== ADMIN_KEY) {
                sendJson(res, 401, { ok: false, error: "Unauthorized" });
                return;
            }
        }

        const rows = listStatesStmt.all();
        const csv = buildStatesCsv(rows);
        try {
            fs.writeFileSync(path.join(DATA_DIR, "states.csv"), csv, "utf8");
        } catch (err) {}
        sendCsv(res, 200, csv, "states.csv");
        return;
    }

    if (pathname === "/api/admin/sync-sheet" && req.method === "POST") {
        if (ADMIN_KEY) {
            const provided = parseAdminKey(req, url);
            if (provided !== ADMIN_KEY) {
                sendJson(res, 401, { ok: false, error: "Unauthorized" });
                return;
            }
        }

        try {
            const result = await syncStatesToGoogleSheet();
            sendJson(res, 200, result);
        } catch (err) {
            sendJson(res, 500, { ok: false, error: err.message || "Sync failed" });
        }
        return;
    }

    serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    if (canSyncToGoogleSheets()) {
        console.log(`Google Sheets sync enabled: sheet=${GOOGLE_SHEET_ID}, tab=${GOOGLE_SHEET_TAB}`);
        if (GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
            console.log(`Using service account key file: ${GOOGLE_SERVICE_ACCOUNT_KEY_FILE}`);
        }
    } else {
        console.log("Google Sheets sync disabled (set GSHEET_SYNC_ENABLED, GOOGLE_SHEET_ID, and service account credentials).");
    }
});

process.on("SIGINT", () => {
    try { db.close(); } catch (err) {}
    process.exit(0);
});

process.on("SIGTERM", () => {
    try { db.close(); } catch (err) {}
    process.exit(0);
});
