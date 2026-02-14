"use strict";

const { google } = require("googleapis");
const crypto = require("crypto");

const STORE_TAB = process.env.GOOGLE_STATE_TAB || "StateStore";
const ADMIN_TAB = process.env.GOOGLE_SHEET_TAB || "States";
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || "";
const SERVICE_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
const SERVICE_KEY = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n");

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

function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;
    const parts = cookieHeader.split(";").map((v) => v.trim()).filter(Boolean);
    for (const p of parts) {
        const idx = p.indexOf("=");
        if (idx < 0) continue;
        const k = p.slice(0, idx);
        const v = p.slice(idx + 1);
        cookies[k] = decodeURIComponent(v);
    }
    return cookies;
}

function ensureClientId(headers) {
    const cookies = parseCookies(headers && (headers.cookie || headers.Cookie));
    let clientId = cookies.gift_client_id;
    let setCookie = null;
    if (!clientId || !/^[a-zA-Z0-9-]{16,}$/.test(clientId)) {
        clientId = crypto.randomUUID();
        setCookie = `gift_client_id=${encodeURIComponent(clientId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;
    }
    return { clientId, setCookie };
}

async function getSheets() {
    if (!GOOGLE_SHEET_ID || !SERVICE_EMAIL || !SERVICE_KEY) {
        throw new Error("Missing Google Sheets env vars");
    }
    const auth = new google.auth.JWT({
        email: SERVICE_EMAIL,
        key: SERVICE_KEY,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });
    return google.sheets({ version: "v4", auth });
}

async function ensureTab(sheets, tabName) {
    const meta = await sheets.spreadsheets.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        fields: "sheets.properties.title"
    });
    const titles = (meta.data.sheets || [])
        .map((s) => s && s.properties ? s.properties.title : "")
        .filter(Boolean);
    if (!titles.includes(tabName)) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: GOOGLE_SHEET_ID,
            requestBody: {
                requests: [{ addSheet: { properties: { title: tabName } } }]
            }
        });
    }
}

async function ensureStoreHeader(sheets) {
    await ensureTab(sheets, STORE_TAB);
    const headerRes = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${STORE_TAB}!A1:C1`
    });
    const row = (headerRes.data.values && headerRes.data.values[0]) || [];
    const ok = row[0] === "client_id" && row[1] === "updated_at" && row[2] === "state_json";
    if (!ok) {
        await sheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: `${STORE_TAB}!A1:C1`,
            valueInputOption: "RAW",
            requestBody: {
                values: [["client_id", "updated_at", "state_json"]]
            }
        });
    }
}

async function getStoreRows(sheets) {
    await ensureStoreHeader(sheets);
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${STORE_TAB}!A2:C`
    });
    const values = res.data.values || [];
    return values.map((r, idx) => ({
        rowNumber: idx + 2,
        clientId: r[0] || "",
        updatedAt: Number(r[1] || 0),
        stateJson: r[2] || "{}"
    }));
}

async function getClientState(clientId) {
    const sheets = await getSheets();
    const rows = await getStoreRows(sheets);
    const row = rows.find((r) => r.clientId === clientId);
    if (!row) return null;
    try {
        return withStateDefaults(JSON.parse(row.stateJson));
    } catch (err) {
        return withStateDefaults(null);
    }
}

async function listClientStates() {
    const sheets = await getSheets();
    const rows = await getStoreRows(sheets);
    return rows.map((r) => {
        let parsed;
        try {
            parsed = withStateDefaults(JSON.parse(r.stateJson));
        } catch (err) {
            parsed = withStateDefaults(null);
        }
        return {
            clientId: r.clientId,
            updatedAt: r.updatedAt,
            state: parsed
        };
    }).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

async function upsertClientState(clientId, nextState) {
    const sheets = await getSheets();
    const rows = await getStoreRows(sheets);
    const normalized = withStateDefaults(nextState);
    const payload = [[clientId, Date.now(), JSON.stringify(normalized)]];
    const existing = rows.find((r) => r.clientId === clientId);

    if (existing) {
        await sheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: `${STORE_TAB}!A${existing.rowNumber}:C${existing.rowNumber}`,
            valueInputOption: "RAW",
            requestBody: { values: payload }
        });
    } else {
        await sheets.spreadsheets.values.append({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: `${STORE_TAB}!A:C`,
            valueInputOption: "RAW",
            insertDataOption: "INSERT_ROWS",
            requestBody: { values: payload }
        });
    }

    await syncAdminTabFromStore();
    return normalized;
}

function toIso(ms) {
    if (!ms || Number.isNaN(Number(ms))) return "";
    try { return new Date(Number(ms)).toISOString(); } catch (err) { return ""; }
}

function buildAdminTable(states) {
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

    const rows = states.map((entry) => {
        const s = entry.state || withStateDefaults(null);
        const unlocked = Array.isArray(s.chests) ? s.chests.filter((c) => c && c.isLocked === false).length : 0;
        const total = Array.isArray(s.chests) ? s.chests.length : 0;
        return [
            entry.clientId,
            entry.updatedAt || 0,
            toIso(entry.updatedAt),
            !!s.tutorialSeen,
            unlocked,
            total,
            s.pendingKey ? (s.pendingKey.code || "") : "",
            s.pendingKey ? (s.pendingKey.targetChestId || "") : "",
            s.pendingKey ? !!s.pendingKey.isRevealed : "",
            s.lastGenerationTime || 0,
            toIso(s.lastGenerationTime),
            s.feedbackSent || "",
            s.ui && s.ui.theme ? s.ui.theme : "",
            s.ui && s.ui.colorScheme ? s.ui.colorScheme : "",
            s.ui && s.ui.highlight ? s.ui.highlight : "",
            Array.isArray(s.adminHistory) ? s.adminHistory.length : 0,
            !!s.puzzleState,
            JSON.stringify(s)
        ];
    });

    return { headers, rows };
}

async function syncAdminTabFromStore() {
    const sheets = await getSheets();
    const states = await listClientStates();
    const table = buildAdminTable(states);

    await ensureTab(sheets, ADMIN_TAB);
    await sheets.spreadsheets.values.clear({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${ADMIN_TAB}!A:Z`
    });
    await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${ADMIN_TAB}!A1`,
        valueInputOption: "RAW",
        requestBody: {
            values: [table.headers, ...table.rows]
        }
    });
    return { ok: true, syncedRows: table.rows.length };
}

function csvEscape(value) {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, "\"\"")}"`;
    return str;
}

function buildAdminCsv(states) {
    const table = buildAdminTable(states);
    const lines = [table.headers.map(csvEscape).join(",")];
    for (const row of table.rows) lines.push(row.map(csvEscape).join(","));
    return `${lines.join("\n")}\n`;
}

function checkAdmin(headers, query) {
    const adminKey = process.env.ADMIN_KEY || "";
    if (!adminKey) return true;
    const h = headers["x-admin-key"] || headers["X-Admin-Key"] || "";
    const q = query && query.key ? query.key : "";
    return (h || q) === adminKey;
}

function json(statusCode, payload, extraHeaders = {}) {
    return {
        statusCode,
        headers: {
            "content-type": "application/json; charset=utf-8",
            ...extraHeaders
        },
        body: JSON.stringify(payload)
    };
}

module.exports = {
    ADMIN_TAB,
    buildAdminCsv,
    checkAdmin,
    defaultState,
    ensureClientId,
    getClientState,
    json,
    listClientStates,
    syncAdminTabFromStore,
    upsertClientState,
    withStateDefaults
};
