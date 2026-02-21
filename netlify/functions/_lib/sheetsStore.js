"use strict";

const { google } = require("googleapis");
const crypto = require("crypto");

const SINGLE_SHEET_MODE = String(process.env.GOOGLE_SINGLE_SHEET_MODE || "false").toLowerCase() === "true";
const MASTER_TAB = process.env.GOOGLE_MASTER_TAB || "GiftControlCenter";
const LEGACY_STORE_TAB = process.env.GOOGLE_STATE_TAB || "StateStore";
const LEGACY_ADMIN_TAB = process.env.GOOGLE_SHEET_TAB || "States";
const LEGACY_DASHBOARD_TAB = process.env.GOOGLE_DASHBOARD_TAB || "Dashboard";
const LEGACY_ACCESS_TAB = process.env.GOOGLE_ACCESS_TAB || "AccessLog";
const LEGACY_LOGIN_TAB = process.env.GOOGLE_LOGIN_TAB || "LoginInfo";
const LEGACY_SESSION_TAB = process.env.GOOGLE_SESSION_TAB || "SessionLogs";
const LEGACY_AUTH_LOCK_TAB = process.env.GOOGLE_AUTH_LOCK_TAB || "AuthLocks";
const LEGACY_FEEDBACK_TAB = process.env.GOOGLE_FEEDBACK_TAB || "Feedback";
const STORE_TAB = SINGLE_SHEET_MODE ? MASTER_TAB : (process.env.GOOGLE_STATE_TAB || "StateStore");
const ADMIN_TAB = SINGLE_SHEET_MODE ? MASTER_TAB : (process.env.GOOGLE_SHEET_TAB || "States");
const DASHBOARD_TAB = SINGLE_SHEET_MODE ? MASTER_TAB : (process.env.GOOGLE_DASHBOARD_TAB || "Dashboard");
const ACCESS_TAB = SINGLE_SHEET_MODE ? MASTER_TAB : (process.env.GOOGLE_ACCESS_TAB || "AccessLog");
const LOGIN_TAB = SINGLE_SHEET_MODE ? MASTER_TAB : (process.env.GOOGLE_LOGIN_TAB || "LoginInfo");
const SESSION_TAB = SINGLE_SHEET_MODE ? MASTER_TAB : (process.env.GOOGLE_SESSION_TAB || "SessionLogs");
const AUTH_LOCK_TAB = SINGLE_SHEET_MODE ? MASTER_TAB : (process.env.GOOGLE_AUTH_LOCK_TAB || "AuthLocks");
const FEEDBACK_TAB = SINGLE_SHEET_MODE ? MASTER_TAB : (process.env.GOOGLE_FEEDBACK_TAB || "Feedback");
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || "";
const SERVICE_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
const SERVICE_KEY = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const SESSION_COOKIE = "gift_session_id";
const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 3);
const LOGIN_LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES || 30);
const AUTO_SYNC_ON_SAVE = String(process.env.GSHEET_AUTO_SYNC_ON_SAVE || "false").toLowerCase() === "true";
const AUTO_SYNC_MIN_INTERVAL_MS = Number(process.env.GSHEET_AUTO_SYNC_MIN_INTERVAL_MS || 300000);
const SESSION_MAX_HOURS = Number(process.env.SESSION_MAX_HOURS || 24);

const headerEnsured = {
    store: false,
    access: false,
    login: false,
    session: false,
    authLock: false,
    feedback: false
};

const readCache = {
    loginRows: { data: null, expiresAt: 0 },
    storeRows: { data: null, expiresAt: 0 },
    sessionRows: { data: null, expiresAt: 0 },
    authLockRows: { data: null, expiresAt: 0 }
};

const READ_CACHE_TTL_MS = 20000;
let lastAutoSyncMs = 0;
let singleSheetPruned = false;

const SINGLE_SHEET_BANDS = {
    admin: "A",
    store: "BA",
    access: "BE",
    login: "BK",
    session: "BS",
    authLock: "CF",
    dashboard: "CN",
    feedback: "CY"
};
const SINGLE_SHEET_WIDTHS = {
    admin: 26,
    store: 3,
    access: 5,
    login: 7,
    session: 12,
    authLock: 7,
    dashboard: 11,
    feedback: 8
};
const LEGACY_TABLE_MAP = {
    store: { tab: LEGACY_STORE_TAB, endCol: "C" },
    access: { tab: LEGACY_ACCESS_TAB, endCol: "E" },
    login: { tab: LEGACY_LOGIN_TAB, endCol: "G" },
    session: { tab: LEGACY_SESSION_TAB, endCol: "L" },
    authLock: { tab: LEGACY_AUTH_LOCK_TAB, endCol: "G" },
    feedback: { tab: LEGACY_FEEDBACK_TAB, endCol: "H" },
    admin: { tab: LEGACY_ADMIN_TAB, endCol: "Z" },
    dashboard: { tab: LEGACY_DASHBOARD_TAB, endCol: "K" }
};

function colToIndex(col) {
    let out = 0;
    const s = String(col || "").toUpperCase();
    for (let i = 0; i < s.length; i++) {
        const code = s.charCodeAt(i);
        if (code < 65 || code > 90) continue;
        out = out * 26 + (code - 64);
    }
    return Math.max(0, out - 1);
}

function indexToCol(index) {
    let n = Number(index) + 1;
    let out = "";
    while (n > 0) {
        const rem = (n - 1) % 26;
        out = String.fromCharCode(65 + rem) + out;
        n = Math.floor((n - 1) / 26);
    }
    return out || "A";
}

function bandStartIndex(tableKey) {
    const startCol = SINGLE_SHEET_BANDS[tableKey] || "A";
    return colToIndex(startCol);
}

function mapRangeFromBand(localA1, tableKey) {
    if (!SINGLE_SHEET_MODE) return localA1;
    const shift = bandStartIndex(tableKey);
    return String(localA1).replace(/([A-Z]+)(\d*)/g, (_, col, row) => `${indexToCol(colToIndex(col) + shift)}${row || ""}`);
}

function rangeFor(tableKey, localA1) {
    const tab = ({
        store: STORE_TAB,
        admin: ADMIN_TAB,
        dashboard: DASHBOARD_TAB,
        access: ACCESS_TAB,
        login: LOGIN_TAB,
        session: SESSION_TAB,
        authLock: AUTH_LOCK_TAB,
        feedback: FEEDBACK_TAB
    })[tableKey];
    return `${tab}!${mapRangeFromBand(localA1, tableKey)}`;
}

function getRequiredSingleSheetColumnCount() {
    return Object.keys(SINGLE_SHEET_BANDS).reduce((max, key) => {
        const startIndex = colToIndex(SINGLE_SHEET_BANDS[key]);
        const width = SINGLE_SHEET_WIDTHS[key] || 1;
        return Math.max(max, startIndex + width);
    }, 1);
}

async function ensureSingleSheetGridCapacity(sheets) {
    if (!SINGLE_SHEET_MODE) return;
    const requiredCols = getRequiredSingleSheetColumnCount();
    const requiredRows = 2000;
    const meta = await sheets.spreadsheets.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        fields: "sheets.properties.sheetId,sheets.properties.title,sheets.properties.gridProperties.columnCount,sheets.properties.gridProperties.rowCount"
    });
    const props = (meta.data.sheets || [])
        .map((s) => (s && s.properties ? s.properties : null))
        .find((p) => p && p.title === MASTER_TAB);
    if (!props || !props.sheetId) return;

    const currentCols = Number(props.gridProperties && props.gridProperties.columnCount ? props.gridProperties.columnCount : 0);
    const currentRows = Number(props.gridProperties && props.gridProperties.rowCount ? props.gridProperties.rowCount : 0);
    const nextCols = Math.max(currentCols || 0, requiredCols);
    const nextRows = Math.max(currentRows || 0, requiredRows);
    if (nextCols === currentCols && nextRows === currentRows) return;

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: GOOGLE_SHEET_ID,
        requestBody: {
            requests: [{
                updateSheetProperties: {
                    properties: {
                        sheetId: props.sheetId,
                        gridProperties: {
                            columnCount: nextCols,
                            rowCount: nextRows
                        }
                    },
                    fields: "gridProperties.columnCount,gridProperties.rowCount"
                }
            }]
        }
    });
}

function getCached(cacheKey) {
    const bucket = readCache[cacheKey];
    if (!bucket || !bucket.data) return null;
    if (Date.now() >= bucket.expiresAt) return null;
    return bucket.data;
}

function setCached(cacheKey, data) {
    const bucket = readCache[cacheKey];
    if (!bucket) return;
    bucket.data = data;
    bucket.expiresAt = Date.now() + READ_CACHE_TTL_MS;
}

function invalidateCache(cacheKey) {
    const bucket = readCache[cacheKey];
    if (!bucket) return;
    bucket.data = null;
    bucket.expiresAt = 0;
}

function defaultState() {
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
            theme: "dark",
            colorScheme: "purple",
            highlight: "purple"
        }
    };
}

const IST_FORMATTER = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
});

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

function normalizePhone(input) {
    const digits = String(input || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
    return digits;
}

function normalizeName(input) {
    return String(input || "").trim().toLowerCase();
}

function parseJsonSafe(text, fallback) {
    if (!text) return fallback;
    try {
        return JSON.parse(text);
    } catch (err) {
        return fallback;
    }
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
        fields: "sheets.properties.sheetId,sheets.properties.title"
    });
    const sheet = (meta.data.sheets || [])
        .map((s) => (s && s.properties) ? s.properties : null)
        .find((p) => p && p.title === tabName);
    if (sheet) return sheet.sheetId;
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: GOOGLE_SHEET_ID,
        requestBody: {
            requests: [{ addSheet: { properties: { title: tabName } } }]
        }
    });
    const metaAfter = await sheets.spreadsheets.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        fields: "sheets.properties.sheetId,sheets.properties.title"
    });
    const created = (metaAfter.data.sheets || [])
        .map((s) => (s && s.properties) ? s.properties : null)
        .find((p) => p && p.title === tabName);
    if (!created) {
        throw new Error(`Failed to create tab: ${tabName}`);
    }
    return created.sheetId;
}

async function maybePruneToMasterSheet(sheets) {
    if (!SINGLE_SHEET_MODE || singleSheetPruned) return;
    await ensureSingleSheetGridCapacity(sheets);
    const meta = await sheets.spreadsheets.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        fields: "sheets.properties.sheetId,sheets.properties.title"
    });
    const properties = (meta.data.sheets || []).map((s) => s && s.properties).filter(Boolean);
    const master = properties.find((p) => p.title === MASTER_TAB);
    if (!master) return;

    const copyLegacyToMaster = async (tableKey) => {
        const conf = LEGACY_TABLE_MAP[tableKey];
        if (!conf || conf.tab === MASTER_TAB) return;
        const sourceExists = properties.some((p) => p.title === conf.tab);
        if (!sourceExists) return;
        const sourceRes = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: `${conf.tab}!A1:${conf.endCol}`
        });
        const sourceValues = sourceRes.data.values || [];
        if (!sourceValues.length) return;

        const targetCheck = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: rangeFor(tableKey, `A1:${conf.endCol}`)
        });
        const existing = targetCheck.data.values || [];
        const hasData = existing.some((row) => Array.isArray(row) && row.some((v) => String(v || "").trim() !== ""));
        if (hasData) return;

        await sheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: rangeFor(tableKey, "A1"),
            valueInputOption: "RAW",
            requestBody: { values: sourceValues }
        });
    };

    await copyLegacyToMaster("store");
    await copyLegacyToMaster("access");
    await copyLegacyToMaster("login");
    await copyLegacyToMaster("session");
    await copyLegacyToMaster("authLock");
    await copyLegacyToMaster("feedback");
    await copyLegacyToMaster("admin");
    await copyLegacyToMaster("dashboard");

    const deleteTargets = properties.filter((p) => p.title !== MASTER_TAB);
    if (!deleteTargets.length) {
        singleSheetPruned = true;
        return;
    }
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: GOOGLE_SHEET_ID,
        requestBody: {
            requests: deleteTargets.map((p) => ({
                deleteSheet: { sheetId: p.sheetId }
            }))
        }
    });
    singleSheetPruned = true;
}

function rgb(r, g, b) {
    return { red: r, green: g, blue: b };
}

const DASH_COLORS = {
    ink: rgb(0.11, 0.14, 0.18),
    textMuted: rgb(0.34, 0.39, 0.46),
    brand: rgb(0.18, 0.29, 0.60),
    brandSoft: rgb(0.90, 0.93, 0.99),
    success: rgb(0.10, 0.52, 0.32),
    successSoft: rgb(0.88, 0.97, 0.92),
    info: rgb(0.12, 0.42, 0.73),
    infoSoft: rgb(0.90, 0.95, 1.0),
    warning: rgb(0.63, 0.41, 0.08),
    warningSoft: rgb(1.0, 0.96, 0.86),
    border: rgb(0.84, 0.87, 0.92),
    bg: rgb(0.98, 0.99, 1.0)
};

async function formatAdminTab(sheets, sheetId, rowCount, colCount) {
    const safeRows = Math.max(rowCount, 1);
    await clearBanding(sheets, sheetId);
    const requests = [
        {
            updateSheetProperties: {
                properties: {
                    sheetId,
                    gridProperties: { frozenRowCount: 1, hideGridlines: true }
                },
                fields: "gridProperties.frozenRowCount,gridProperties.hideGridlines"
            }
        },
        {
            repeatCell: {
                range: {
                    sheetId,
                    startRowIndex: 0,
                    endRowIndex: 1,
                    startColumnIndex: 0,
                    endColumnIndex: colCount
                },
                cell: {
                    userEnteredFormat: {
                        backgroundColor: DASH_COLORS.brand,
                        textFormat: { bold: true, fontSize: 10, foregroundColor: rgb(1, 1, 1) },
                        horizontalAlignment: "CENTER",
                        verticalAlignment: "MIDDLE"
                    }
                },
                fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)"
            }
        },
        {
            repeatCell: {
                range: {
                    sheetId,
                    startRowIndex: 1,
                    endRowIndex: safeRows + 1,
                    startColumnIndex: 0,
                    endColumnIndex: colCount
                },
                cell: {
                    userEnteredFormat: {
                        backgroundColor: DASH_COLORS.bg,
                        textFormat: { foregroundColor: DASH_COLORS.ink, fontSize: 10 },
                        verticalAlignment: "MIDDLE"
                    }
                },
                fields: "userEnteredFormat(backgroundColor,textFormat,verticalAlignment)"
            }
        },
        {
            repeatCell: {
                range: {
                    sheetId,
                    startRowIndex: 1,
                    endRowIndex: safeRows + 1,
                    startColumnIndex: 3,
                    endColumnIndex: 4
                },
                cell: {
                    userEnteredFormat: {
                        textFormat: { bold: true, foregroundColor: DASH_COLORS.brand }
                    }
                },
                fields: "userEnteredFormat.textFormat"
            }
        },
        {
            repeatCell: {
                range: {
                    sheetId,
                    startRowIndex: 1,
                    endRowIndex: safeRows + 1,
                    startColumnIndex: 4,
                    endColumnIndex: 5
                },
                cell: {
                    userEnteredFormat: {
                        numberFormat: { type: "PERCENT", pattern: "0.0%" }
                    }
                },
                fields: "userEnteredFormat.numberFormat"
            }
        },
        {
            repeatCell: {
                range: {
                    sheetId,
                    startRowIndex: 1,
                    endRowIndex: safeRows + 1,
                    startColumnIndex: 0,
                    endColumnIndex: 1
                },
                cell: {
                    userEnteredFormat: {
                        textFormat: { foregroundColor: DASH_COLORS.textMuted, fontSize: 9 }
                    }
                },
                fields: "userEnteredFormat.textFormat"
            }
        },
        {
            updateBorders: {
                range: {
                    sheetId,
                    startRowIndex: 0,
                    endRowIndex: safeRows + 1,
                    startColumnIndex: 0,
                    endColumnIndex: colCount
                },
                top: { style: "SOLID", color: DASH_COLORS.border },
                bottom: { style: "SOLID", color: DASH_COLORS.border },
                left: { style: "SOLID", color: DASH_COLORS.border },
                right: { style: "SOLID", color: DASH_COLORS.border },
                innerHorizontal: { style: "SOLID", color: DASH_COLORS.border },
                innerVertical: { style: "SOLID", color: DASH_COLORS.border }
            }
        },
        {
            addBanding: {
                bandedRange: {
                    range: {
                        sheetId,
                        startRowIndex: 1,
                        endRowIndex: safeRows + 1,
                        startColumnIndex: 0,
                        endColumnIndex: colCount
                    },
                    rowProperties: {
                        firstBandColor: rgb(1, 1, 1),
                        secondBandColor: rgb(0.96, 0.98, 1)
                    }
                }
            }
        },
        {
            autoResizeDimensions: {
                dimensions: {
                    sheetId,
                    dimension: "COLUMNS",
                    startIndex: 0,
                    endIndex: colCount
                }
            }
        }
    ];

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: GOOGLE_SHEET_ID,
        requestBody: { requests }
    });
}

async function getSessionAnalytics(sheets) {
    const rows = await getSessionRows(sheets);
    const totalSessions = rows.length;
    const activeSessions = rows.filter((r) => (r.status || "").toUpperCase() === "ACTIVE").length;
    const completed = rows.filter((r) => Number(r.durationSec || 0) > 0);
    const avgDurationSec = completed.length
        ? Math.round(completed.reduce((sum, r) => sum + Number(r.durationSec || 0), 0) / completed.length)
        : 0;
    const totalScreenSec = rows.reduce((sum, r) => sum + Number(r.screenTimeSec || 0), 0);
    return {
        totalSessions,
        activeSessions,
        avgDurationSec,
        totalScreenSec
    };
}

async function getAccessAnalytics(sheets) {
    const rows = await getAccessRows(sheets);
    const eventCounts = {};
    for (const row of rows) {
        const key = String(row.event || "unknown").trim() || "unknown";
        eventCounts[key] = (eventCounts[key] || 0) + 1;
    }
    return {
        totalEvents: rows.length,
        loginEvents: Number(eventCounts.login || 0),
        unlockEvents: Number(eventCounts.unlock || 0),
        openEvents: Number(eventCounts.open || 0),
        feedbackEvents: Number(eventCounts.feedback || 0),
        byType: eventCounts
    };
}

async function syncDashboardTab(sheets, states) {
    const dashboardSheetId = await ensureTab(sheets, DASHBOARD_TAB);
    if (SINGLE_SHEET_MODE) {
        await ensureSingleSheetGridCapacity(sheets);
    }
    await clearBanding(sheets, dashboardSheetId);
    const adminRef = `'${ADMIN_TAB.replace(/'/g, "''")}'`;
    const dashboardOffset = SINGLE_SHEET_MODE ? bandStartIndex("dashboard") : 0;
    const sessionStats = await getSessionAnalytics(sheets);
    const accessStats = await getAccessAnalytics(sheets);
    const totalUsers = states.length;
    const progressPercents = states.map((entry) => {
        const chests = Array.isArray(entry.state && entry.state.chests) ? entry.state.chests : [];
        if (!chests.length) return 0;
        const unlocked = chests.filter((c) => c && c.isLocked === false).length;
        return unlocked / chests.length;
    });
    const avgProgress = progressPercents.length
        ? (progressPercents.reduce((a, b) => a + b, 0) / progressPercents.length)
        : 0;
    const completedUsers = progressPercents.filter((v) => v >= 1).length;
    const pendingUsers = states.filter((entry) => !!(entry.state && entry.state.pendingKey)).length;
    const feedbackGiven = states.filter((entry) => !!(entry.state && entry.state.feedbackSent)).length;

    await sheets.spreadsheets.values.clear({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: rangeFor("dashboard", "A:K")
    });
    await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: rangeFor("dashboard", "A1"),
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [
                ["Secret Chests - Admin Dashboard"],
                [""],
                ["Metric", "Value", "", "Progress Trend", "", "", "Theme Split", ""],
                ["Total Users", totalUsers, "", `=SPARKLINE(${adminRef}!J2:J,{"charttype","column";"color","#5e35b1"})`, "", "", "Dark", `=COUNTIF(${adminRef}!Q2:Q,"dark")`],
                ["Average Progress", avgProgress, "", "", "", "", "Light", `=COUNTIF(${adminRef}!Q2:Q,"light")`],
                ["Completed Users", completedUsers],
                ["Users With Pending Key", pendingUsers],
                ["Feedback Given", feedbackGiven],
                ["Total Sessions", sessionStats.totalSessions, "", "", "", "", "Active Sessions", sessionStats.activeSessions],
                ["Avg Session Duration (sec)", sessionStats.avgDurationSec],
                ["Total Screen Time (sec)", sessionStats.totalScreenSec, "", "", "", "", "Total Events", accessStats.totalEvents],
                ["Login Events", accessStats.loginEvents, "", "", "", "", "Unlock Events", accessStats.unlockEvents],
                ["Open Events", accessStats.openEvents, "", "", "", "", "Feedback Events", accessStats.feedbackEvents],
                ["Top Event Type", Object.entries(accessStats.byType).sort((a, b) => b[1] - a[1])[0]?.[0] || "None", "", "", "", "", "Top Event Count", Object.entries(accessStats.byType).sort((a, b) => b[1] - a[1])[0]?.[1] || 0],
                ["Users with >=50% Progress", `=COUNTIF(${adminRef}!J2:J,\">=0.5\")`, "", "", "", "", "Users with 100% Progress", `=COUNTIF(${adminRef}!J2:J,\">=1\")`]
            ]
        }
    });

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: GOOGLE_SHEET_ID,
        requestBody: {
            requests: [
                {
                    updateSheetProperties: {
                        properties: {
                            sheetId: dashboardSheetId,
                            gridProperties: { frozenRowCount: 3 }
                        },
                        fields: "gridProperties.frozenRowCount"
                    }
                },
                {
                    unmergeCells: {
                        range: { sheetId: dashboardSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: dashboardOffset, endColumnIndex: dashboardOffset + 8 }
                    }
                },
                {
                    mergeCells: {
                        range: { sheetId: dashboardSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: dashboardOffset, endColumnIndex: dashboardOffset + 8 },
                        mergeType: "MERGE_ALL"
                    }
                },
                {
                    repeatCell: {
                        range: { sheetId: dashboardSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: dashboardOffset, endColumnIndex: dashboardOffset + 8 },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: DASH_COLORS.brand,
                                textFormat: { bold: true, fontSize: 14, foregroundColor: rgb(1, 1, 1) },
                                horizontalAlignment: "CENTER"
                            }
                        },
                        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
                    }
                },
                {
                    repeatCell: {
                        range: { sheetId: dashboardSheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: dashboardOffset, endColumnIndex: dashboardOffset + 8 },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: DASH_COLORS.brandSoft,
                                textFormat: { bold: true, foregroundColor: DASH_COLORS.brand }
                            }
                        },
                        fields: "userEnteredFormat(backgroundColor,textFormat)"
                    }
                },
                {
                    repeatCell: {
                        range: { sheetId: dashboardSheetId, startRowIndex: 3, endRowIndex: 15, startColumnIndex: dashboardOffset, endColumnIndex: dashboardOffset + 2 },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: DASH_COLORS.bg,
                                textFormat: { foregroundColor: DASH_COLORS.ink }
                            }
                        },
                        fields: "userEnteredFormat(backgroundColor,textFormat)"
                    }
                },
                {
                    repeatCell: {
                        range: { sheetId: dashboardSheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: dashboardOffset, endColumnIndex: dashboardOffset + 2 },
                        cell: { userEnteredFormat: { backgroundColor: DASH_COLORS.infoSoft } },
                        fields: "userEnteredFormat.backgroundColor"
                    }
                },
                {
                    repeatCell: {
                        range: { sheetId: dashboardSheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: dashboardOffset, endColumnIndex: dashboardOffset + 2 },
                        cell: { userEnteredFormat: { backgroundColor: DASH_COLORS.successSoft } },
                        fields: "userEnteredFormat.backgroundColor"
                    }
                },
                {
                    repeatCell: {
                        range: { sheetId: dashboardSheetId, startRowIndex: 5, endRowIndex: 15, startColumnIndex: dashboardOffset, endColumnIndex: dashboardOffset + 2 },
                        cell: { userEnteredFormat: { backgroundColor: DASH_COLORS.warningSoft } },
                        fields: "userEnteredFormat.backgroundColor"
                    }
                },
                {
                    repeatCell: {
                        range: { sheetId: dashboardSheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: dashboardOffset + 1, endColumnIndex: dashboardOffset + 2 },
                        cell: { userEnteredFormat: { numberFormat: { type: "PERCENT", pattern: "0.0%" } } },
                        fields: "userEnteredFormat.numberFormat"
                    }
                },
                {
                    updateBorders: {
                        range: { sheetId: dashboardSheetId, startRowIndex: 2, endRowIndex: 15, startColumnIndex: dashboardOffset, endColumnIndex: dashboardOffset + 8 },
                        top: { style: "SOLID", color: DASH_COLORS.border },
                        bottom: { style: "SOLID", color: DASH_COLORS.border },
                        left: { style: "SOLID", color: DASH_COLORS.border },
                        right: { style: "SOLID", color: DASH_COLORS.border },
                        innerHorizontal: { style: "SOLID", color: DASH_COLORS.border },
                        innerVertical: { style: "SOLID", color: DASH_COLORS.border }
                    }
                },
                {
                    autoResizeDimensions: {
                        dimensions: {
                            sheetId: dashboardSheetId,
                            dimension: "COLUMNS",
                            startIndex: dashboardOffset,
                            endIndex: dashboardOffset + 8
                        }
                    }
                }
            ]
        }
    });
}

async function clearAdminConditionalRules(sheets, sheetId) {
    const meta = await sheets.spreadsheets.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        fields: "sheets(properties(sheetId),conditionalFormats)"
    });
    const sheet = (meta.data.sheets || []).find((s) => s.properties && s.properties.sheetId === sheetId);
    const count = sheet && Array.isArray(sheet.conditionalFormats) ? sheet.conditionalFormats.length : 0;
    if (!count) return;
    for (let i = count - 1; i >= 0; i--) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: GOOGLE_SHEET_ID,
            requestBody: {
                requests: [{ deleteConditionalFormatRule: { sheetId, index: i } }]
            }
        });
    }
}

async function clearBanding(sheets, sheetId) {
    const meta = await sheets.spreadsheets.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        fields: "sheets(properties(sheetId),bandedRanges.bandedRangeId)"
    });
    const sheet = (meta.data.sheets || []).find((s) => s.properties && s.properties.sheetId === sheetId);
    const ranges = (sheet && Array.isArray(sheet.bandedRanges)) ? sheet.bandedRanges : [];
    if (!ranges.length) return;
    for (const b of ranges) {
        if (!b || !b.bandedRangeId) continue;
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: GOOGLE_SHEET_ID,
            requestBody: {
                requests: [{ deleteBanding: { bandedRangeId: b.bandedRangeId } }]
            }
        });
    }
}

async function formatSingleSheetSections(sheets) {
    if (!SINGLE_SHEET_MODE) return;
    const sheetId = await ensureTab(sheets, MASTER_TAB);
    await ensureSingleSheetGridCapacity(sheets);
    await clearBanding(sheets, sheetId);

    const sectionColors = {
        admin: DASH_COLORS.brandSoft,
        dashboard: DASH_COLORS.infoSoft,
        login: DASH_COLORS.successSoft,
        store: DASH_COLORS.warningSoft,
        session: rgb(0.92, 0.94, 1.0),
        access: rgb(0.94, 0.98, 0.95),
        authLock: rgb(1.0, 0.92, 0.92),
        feedback: rgb(0.96, 0.93, 1.0)
    };

    const requests = [{
        updateSheetProperties: {
            properties: {
                sheetId,
                gridProperties: { frozenRowCount: 1, hideGridlines: true }
            },
            fields: "gridProperties.frozenRowCount,gridProperties.hideGridlines"
        }
    }];

    for (const [key, startCol] of Object.entries(SINGLE_SHEET_BANDS)) {
        const startIndex = colToIndex(startCol);
        const width = SINGLE_SHEET_WIDTHS[key] || 1;
        requests.push({
            repeatCell: {
                range: {
                    sheetId,
                    startRowIndex: 0,
                    endRowIndex: 1,
                    startColumnIndex: startIndex,
                    endColumnIndex: startIndex + width
                },
                cell: {
                    userEnteredFormat: {
                        backgroundColor: sectionColors[key] || DASH_COLORS.bg,
                        textFormat: { bold: true, foregroundColor: DASH_COLORS.ink, fontSize: 10 },
                        horizontalAlignment: "CENTER",
                        verticalAlignment: "MIDDLE"
                    }
                },
                fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)"
            }
        });
        requests.push({
            autoResizeDimensions: {
                dimensions: {
                    sheetId,
                    dimension: "COLUMNS",
                    startIndex,
                    endIndex: startIndex + width
                }
            }
        });
        requests.push({
            updateBorders: {
                range: {
                    sheetId,
                    startRowIndex: 0,
                    endRowIndex: 2000,
                    startColumnIndex: startIndex,
                    endColumnIndex: startIndex + width
                },
                left: { style: "SOLID_MEDIUM", color: DASH_COLORS.border },
                right: { style: "SOLID_MEDIUM", color: DASH_COLORS.border }
            }
        });
        requests.push({
            addBanding: {
                bandedRange: {
                    range: {
                        sheetId,
                        startRowIndex: 1,
                        endRowIndex: 2000,
                        startColumnIndex: startIndex,
                        endColumnIndex: startIndex + width
                    },
                    rowProperties: {
                        headerColor: sectionColors[key] || DASH_COLORS.brandSoft,
                        firstBandColor: rgb(1, 1, 1),
                        secondBandColor: rgb(0.97, 0.98, 1.0)
                    }
                }
            }
        });
    }

    const filterEndIndex = getRequiredSingleSheetColumnCount();

    requests.push({
        setBasicFilter: {
            filter: {
                range: {
                    sheetId,
                    startRowIndex: 0,
                    endRowIndex: 2000,
                    startColumnIndex: 0,
                    endColumnIndex: filterEndIndex
                }
            }
        }
    });

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: GOOGLE_SHEET_ID,
        requestBody: { requests }
    });
}

async function formatStructuredTabs(sheets) {
    if (SINGLE_SHEET_MODE) return;
    const tabSpecs = [
        { name: ADMIN_TAB, width: 28, color: DASH_COLORS.brandSoft, frozen: 1 },
        { name: DASHBOARD_TAB, width: 12, color: DASH_COLORS.infoSoft, frozen: 3 },
        { name: LOGIN_TAB, width: 8, color: DASH_COLORS.successSoft, frozen: 1 },
        { name: STORE_TAB, width: 4, color: DASH_COLORS.warningSoft, frozen: 1 },
        { name: SESSION_TAB, width: 13, color: rgb(0.92, 0.94, 1.0), frozen: 1 },
        { name: ACCESS_TAB, width: 6, color: rgb(0.94, 0.98, 0.95), frozen: 1 },
        { name: AUTH_LOCK_TAB, width: 8, color: rgb(1.0, 0.92, 0.92), frozen: 1 },
        { name: FEEDBACK_TAB, width: 9, color: rgb(0.96, 0.93, 1.0), frozen: 1 }
    ];
    for (const spec of tabSpecs) {
        const sheetId = await ensureTab(sheets, spec.name);
        await clearBanding(sheets, sheetId);
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: GOOGLE_SHEET_ID,
            requestBody: {
                requests: [
                    {
                        updateSheetProperties: {
                            properties: {
                                sheetId,
                                gridProperties: {
                                    frozenRowCount: spec.frozen,
                                    hideGridlines: true
                                }
                            },
                            fields: "gridProperties.frozenRowCount,gridProperties.hideGridlines"
                        }
                    },
                    {
                        repeatCell: {
                            range: {
                                sheetId,
                                startRowIndex: 0,
                                endRowIndex: 1,
                                startColumnIndex: 0,
                                endColumnIndex: spec.width
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: spec.color,
                                    textFormat: { bold: true, foregroundColor: DASH_COLORS.ink, fontSize: 10 },
                                    horizontalAlignment: "CENTER",
                                    verticalAlignment: "MIDDLE"
                                }
                            },
                            fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)"
                        }
                    },
                    {
                        addBanding: {
                            bandedRange: {
                                range: {
                                    sheetId,
                                    startRowIndex: 1,
                                    endRowIndex: 2000,
                                    startColumnIndex: 0,
                                    endColumnIndex: spec.width
                                },
                                rowProperties: {
                                    firstBandColor: rgb(1, 1, 1),
                                    secondBandColor: rgb(0.97, 0.98, 1.0)
                                }
                            }
                        }
                    },
                    {
                        autoResizeDimensions: {
                            dimensions: {
                                sheetId,
                                dimension: "COLUMNS",
                                startIndex: 0,
                                endIndex: spec.width
                            }
                        }
                    }
                ]
            }
        });
    }
}

async function ensureStoreHeader(sheets) {
    if (headerEnsured.store) return;
    await ensureTab(sheets, STORE_TAB);
    await maybePruneToMasterSheet(sheets);
    const headerRes = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: rangeFor("store", "A1:C1")
    });
    const row = (headerRes.data.values && headerRes.data.values[0]) || [];
    const ok = (row[0] === "user_id" || row[0] === "client_id") && row[1] === "updated_at" && row[2] === "state_json";
    if (!ok) {
        await sheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: rangeFor("store", "A1:C1"),
            valueInputOption: "RAW",
            requestBody: {
                values: [["user_id", "updated_at", "state_json"]]
            }
        });
    }
    headerEnsured.store = true;
}

async function ensureAccessHeader(sheets) {
    if (headerEnsured.access) return;
    await ensureTab(sheets, ACCESS_TAB);
    await maybePruneToMasterSheet(sheets);
    const headerRes = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: rangeFor("access", "A1:E1")
    });
    const row = (headerRes.data.values && headerRes.data.values[0]) || [];
    const ok = row[0] === "accessed_at_ist" && row[1] === "accessed_at_ms" && row[2] === "user_id" && row[3] === "session_id" && row[4] === "event";
    if (!ok) {
        await sheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: rangeFor("access", "A1:E1"),
            valueInputOption: "RAW",
            requestBody: {
                values: [["accessed_at_ist", "accessed_at_ms", "user_id", "session_id", "event"]]
            }
        });
    }
    headerEnsured.access = true;
}

async function ensureLoginHeader(sheets) {
    if (headerEnsured.login) return;
    await ensureTab(sheets, LOGIN_TAB);
    await maybePruneToMasterSheet(sheets);
    const headerRes = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: rangeFor("login", "A1:G1")
    });
    const row = (headerRes.data.values && headerRes.data.values[0]) || [];
    const expected = ["user_id", "name", "phone", "is_active", "page_title", "content_json", "notes"];
    const ok = expected.every((v, i) => row[i] === v);
    if (!ok) {
        await sheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: rangeFor("login", "A1:G1"),
            valueInputOption: "RAW",
            requestBody: { values: [expected] }
        });
    }
    headerEnsured.login = true;
}

async function ensureSessionHeader(sheets) {
    if (headerEnsured.session) return;
    await ensureTab(sheets, SESSION_TAB);
    await maybePruneToMasterSheet(sheets);
    const headerRes = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: rangeFor("session", "A1:L1")
    });
    const row = (headerRes.data.values && headerRes.data.values[0]) || [];
    const expected = [
        "session_id",
        "user_id",
        "name",
        "phone",
        "login_time_ist",
        "login_time_ms",
        "logout_time_ist",
        "logout_time_ms",
        "duration_sec",
        "screen_time_sec",
        "last_seen_ist",
        "status"
    ];
    const ok = expected.every((v, i) => row[i] === v);
    if (!ok) {
        await sheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: rangeFor("session", "A1:L1"),
            valueInputOption: "RAW",
            requestBody: { values: [expected] }
        });
    }
    headerEnsured.session = true;
}

async function ensureAuthLockHeader(sheets) {
    if (headerEnsured.authLock) return;
    await ensureTab(sheets, AUTH_LOCK_TAB);
    await maybePruneToMasterSheet(sheets);
    const headerRes = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: rangeFor("authLock", "A1:G1")
    });
    const row = (headerRes.data.values && headerRes.data.values[0]) || [];
    const expected = [
        "lock_key",
        "fail_count",
        "lock_until_ms",
        "lock_until_ist",
        "last_failed_ist",
        "last_name",
        "last_phone"
    ];
    const ok = expected.every((v, i) => row[i] === v);
    if (!ok) {
        await sheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: rangeFor("authLock", "A1:G1"),
            valueInputOption: "RAW",
            requestBody: { values: [expected] }
        });
    }
    headerEnsured.authLock = true;
}

async function ensureFeedbackHeader(sheets) {
    if (SINGLE_SHEET_MODE) {
        await ensureSingleSheetGridCapacity(sheets);
    }
    if (headerEnsured.feedback) return;
    await ensureTab(sheets, FEEDBACK_TAB);
    await maybePruneToMasterSheet(sheets);
    const headerRes = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: rangeFor("feedback", "A1:H1")
    });
    const row = (headerRes.data.values && headerRes.data.values[0]) || [];
    const expected = [
        "submitted_at_ist",
        "submitted_at_ms",
        "user_id",
        "name",
        "phone",
        "session_id",
        "reaction",
        "feedback_text"
    ];
    const ok = expected.every((v, i) => row[i] === v);
    if (!ok) {
        await sheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: rangeFor("feedback", "A1:H1"),
            valueInputOption: "RAW",
            requestBody: { values: [expected] }
        });
    }
    headerEnsured.feedback = true;
}

async function appendFeedbackEntry({ userId = "", name = "", phone = "", sessionId = "", reaction = "", feedbackText = "" } = {}) {
    const text = String(feedbackText || "").trim();
    if (!text) throw new Error("feedback text is required");
    const sheets = await getSheets();
    if (SINGLE_SHEET_MODE) {
        await ensureSingleSheetGridCapacity(sheets);
    }
    await ensureFeedbackHeader(sheets);
    const now = Date.now();
    const values = [[
        formatIst(now),
        now,
        String(userId || ""),
        String(name || ""),
        String(phone || ""),
        String(sessionId || ""),
        String(reaction || ""),
        text
    ]];
    await sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: rangeFor("feedback", "A:H"),
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values }
    });
    return { ok: true, at: now };
}

async function logAccessEvent(userId, eventType = "visit", sessionId = "") {
    const sheets = await getSheets();
    const now = Date.now();
    const values = [[formatIst(now), now, userId, sessionId, eventType]];
    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: rangeFor("access", "A:E"),
            valueInputOption: "RAW",
            insertDataOption: "INSERT_ROWS",
            requestBody: { values }
        });
    } catch (err) {
        // First-run fallback: create tab/header once, then retry append.
        await ensureAccessHeader(sheets);
        await sheets.spreadsheets.values.append({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: rangeFor("access", "A:E"),
            valueInputOption: "RAW",
            insertDataOption: "INSERT_ROWS",
            requestBody: { values }
        });
    }
}

async function getLoginRows(sheets) {
    const cached = getCached("loginRows");
    if (cached) return cached;
    await ensureLoginHeader(sheets);
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: rangeFor("login", "A2:G")
    });
    const values = res.data.values || [];
    const rows = values.map((r, idx) => ({
        rowNumber: idx + 2,
        userId: String(r[0] || "").trim(),
        name: String(r[1] || "").trim(),
        phone: String(r[2] || "").trim(),
        isActive: String(r[3] || "true").trim(),
        pageTitle: String(r[4] || "").trim(),
        contentJson: String(r[5] || "").trim(),
        notes: String(r[6] || "").trim()
    })).filter((r) => !!r.userId);
    setCached("loginRows", rows);
    return rows;
}

function getLockKey(name, phone) {
    const n = normalizeName(name);
    const p = normalizePhone(phone);
    if (p) return `p:${p}`;
    if (n) return `n:${n}`;
    return "";
}

async function getAuthLockRows(sheets) {
    const cached = getCached("authLockRows");
    if (cached) return cached;
    await ensureAuthLockHeader(sheets);
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: rangeFor("authLock", "A2:G")
    });
    const values = res.data.values || [];
    const rows = values.map((r, idx) => ({
        rowNumber: idx + 2,
        lockKey: String(r[0] || "").trim(),
        failCount: Number(r[1] || 0),
        lockUntilMs: Number(r[2] || 0),
        lockUntilIst: String(r[3] || ""),
        lastFailedIst: String(r[4] || ""),
        lastName: String(r[5] || ""),
        lastPhone: String(r[6] || "")
    })).filter((r) => !!r.lockKey);
    setCached("authLockRows", rows);
    return rows;
}

async function getAuthLockForIdentity(name, phone) {
    const lockKey = getLockKey(name, phone);
    if (!lockKey) return null;
    const sheets = await getSheets();
    const rows = await getAuthLockRows(sheets);
    return rows.find((r) => r.lockKey === lockKey) || null;
}

async function upsertAuthLock(lockKey, data) {
    if (!lockKey) return;
    const sheets = await getSheets();
    const rows = await getAuthLockRows(sheets);
    const existing = rows.find((r) => r.lockKey === lockKey);
    const payload = [[
        lockKey,
        Number(data.failCount || 0),
        Number(data.lockUntilMs || 0),
        data.lockUntilMs ? formatIst(data.lockUntilMs) : "",
        data.lastFailedMs ? formatIst(data.lastFailedMs) : "",
        String(data.lastName || ""),
        String(data.lastPhone || "")
    ]];
    if (existing) {
        await sheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: rangeFor("authLock", `A${existing.rowNumber}:G${existing.rowNumber}`),
            valueInputOption: "RAW",
            requestBody: { values: payload }
        });
    } else {
        await sheets.spreadsheets.values.append({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: rangeFor("authLock", "A:G"),
            valueInputOption: "RAW",
            insertDataOption: "INSERT_ROWS",
            requestBody: { values: payload }
        });
    }
    invalidateCache("authLockRows");
}

async function clearAuthLock(name, phone) {
    const lockKey = getLockKey(name, phone);
    if (!lockKey) return;
    await upsertAuthLock(lockKey, {
        failCount: 0,
        lockUntilMs: 0,
        lastFailedMs: Date.now(),
        lastName: String(name || ""),
        lastPhone: String(phone || "")
    });
}

async function getLoginLockState(name, phone) {
    const lock = await getAuthLockForIdentity(name, phone);
    if (!lock) return { locked: false, attemptsLeft: LOGIN_MAX_ATTEMPTS };
    const now = Date.now();
    if ((lock.lockUntilMs || 0) > now) {
        return {
            locked: true,
            attemptsLeft: 0,
            retryAfterSec: Math.ceil((lock.lockUntilMs - now) / 1000),
            lockUntilIst: lock.lockUntilIst
        };
    }
    const failCount = Number(lock.failCount || 0);
    return {
        locked: false,
        attemptsLeft: Math.max(0, LOGIN_MAX_ATTEMPTS - failCount),
        failCount
    };
}

async function registerLoginFailure(name, phone) {
    const lockKey = getLockKey(name, phone);
    if (!lockKey) {
        return { locked: false, attemptsLeft: LOGIN_MAX_ATTEMPTS };
    }
    const current = await getAuthLockForIdentity(name, phone);
    const now = Date.now();
    const activeLock = current && (current.lockUntilMs || 0) > now;
    if (activeLock) {
        return {
            locked: true,
            attemptsLeft: 0,
            retryAfterSec: Math.ceil((current.lockUntilMs - now) / 1000),
            lockUntilIst: current.lockUntilIst
        };
    }
    const nextFailCount = Math.max(0, Number(current ? current.failCount : 0)) + 1;
    const shouldLock = nextFailCount >= LOGIN_MAX_ATTEMPTS;
    const lockUntilMs = shouldLock ? (now + LOGIN_LOCK_MINUTES * 60 * 1000) : 0;
    await upsertAuthLock(lockKey, {
        failCount: shouldLock ? 0 : nextFailCount,
        lockUntilMs,
        lastFailedMs: now,
        lastName: String(name || ""),
        lastPhone: normalizePhone(phone)
    });
    if (shouldLock) {
        return {
            locked: true,
            attemptsLeft: 0,
            retryAfterSec: LOGIN_LOCK_MINUTES * 60,
            lockUntilIst: formatIst(lockUntilMs)
        };
    }
    return {
        locked: false,
        attemptsLeft: Math.max(0, LOGIN_MAX_ATTEMPTS - nextFailCount),
        failCount: nextFailCount
    };
}

function parseUserContentProfile(loginRow) {
    const profile = parseJsonSafe(loginRow.contentJson, {});
    return {
        userId: loginRow.userId,
        name: loginRow.name,
        phone: loginRow.phone,
        pageTitle: loginRow.pageTitle || "",
        contentProfile: profile && typeof profile === "object" ? profile : {}
    };
}

async function getUserById(userId) {
    if (!userId) return null;
    const sheets = await getSheets();
    const rows = await getLoginRows(sheets);
    const found = rows.find((r) => r.userId === userId);
    return found ? parseUserContentProfile(found) : null;
}

function sanitizeLoginUserInput(input) {
    const userId = String(input.userId || "").trim();
    const name = String(input.name || "").trim();
    const phone = normalizePhone(input.phone || "");
    const isActive = String(input.isActive === false ? "false" : input.isActive || "true").toLowerCase();
    const pageTitle = String(input.pageTitle || "").trim();
    const notes = String(input.notes || "").trim();
    const contentProfile = input.contentProfile && typeof input.contentProfile === "object" ? input.contentProfile : {};
    if (!userId) throw new Error("userId is required");
    if (!name) throw new Error("name is required");
    if (!phone) throw new Error("phone is required");
    return {
        userId,
        name,
        phone,
        isActive: (isActive === "false" || isActive === "0" || isActive === "no") ? "false" : "true",
        pageTitle,
        contentJson: JSON.stringify(contentProfile || {}),
        notes
    };
}

async function listLoginUsers() {
    const sheets = await getSheets();
    const rows = await getLoginRows(sheets);
    return rows.map((r) => ({
        userId: r.userId,
        name: r.name,
        phone: r.phone,
        isActive: !["false", "0", "no"].includes(String(r.isActive || "").toLowerCase()),
        pageTitle: r.pageTitle,
        contentProfile: parseJsonSafe(r.contentJson, {}),
        notes: r.notes
    }));
}

async function upsertLoginUser(input) {
    const payload = sanitizeLoginUserInput(input);
    const sheets = await getSheets();
    const rows = await getLoginRows(sheets);
    const existing = rows.find((r) => r.userId === payload.userId);
    const values = [[
        payload.userId,
        payload.name,
        payload.phone,
        payload.isActive,
        payload.pageTitle,
        payload.contentJson,
        payload.notes
    ]];
    if (existing) {
        await sheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: rangeFor("login", `A${existing.rowNumber}:G${existing.rowNumber}`),
            valueInputOption: "RAW",
            requestBody: { values }
        });
    } else {
        await sheets.spreadsheets.values.append({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: rangeFor("login", "A:G"),
            valueInputOption: "RAW",
            insertDataOption: "INSERT_ROWS",
            requestBody: { values }
        });
    }
    invalidateCache("loginRows");
    return {
        userId: payload.userId,
        name: payload.name,
        phone: payload.phone,
        isActive: payload.isActive === "true",
        pageTitle: payload.pageTitle,
        contentProfile: parseJsonSafe(payload.contentJson, {}),
        notes: payload.notes
    };
}

async function deleteLoginUser(userId) {
    const id = String(userId || "").trim();
    if (!id) throw new Error("userId is required");
    const sheets = await getSheets();
    const rows = await getLoginRows(sheets);
    const existing = rows.find((r) => r.userId === id);
    if (!existing) return { ok: true, deleted: false };

    if (SINGLE_SHEET_MODE) {
        await sheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: rangeFor("login", `A${existing.rowNumber}:G${existing.rowNumber}`),
            valueInputOption: "RAW",
            requestBody: { values: [["", "", "", "", "", "", ""]] }
        });
    } else {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: GOOGLE_SHEET_ID,
            requestBody: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: await ensureTab(sheets, LOGIN_TAB),
                            dimension: "ROWS",
                            startIndex: existing.rowNumber - 1,
                            endIndex: existing.rowNumber
                        }
                    }
                }]
            }
        });
    }
    invalidateCache("loginRows");
    return { ok: true, deleted: true };
}

async function verifyLoginIdentity(name, phone) {
    const lockState = await getLoginLockState(name, phone);
    if (lockState.locked) {
        return {
            ok: false,
            reason: "LOCKED",
            ...lockState
        };
    }

    const sheets = await getSheets();
    const rows = await getLoginRows(sheets);
    const targetName = normalizeName(name);
    const targetPhone = normalizePhone(phone);
    if (!targetName || !targetPhone) {
        const failure = await registerLoginFailure(name, phone);
        return {
            ok: false,
            reason: "INVALID_INPUT",
            ...failure
        };
    }
    const found = rows.find((r) => {
        const activeText = (r.isActive || "true").toLowerCase();
        const isActive = activeText === "" || activeText === "true" || activeText === "yes" || activeText === "1";
        return isActive && normalizeName(r.name) === targetName && normalizePhone(r.phone) === targetPhone;
    });
    if (!found) {
        const failure = await registerLoginFailure(name, phone);
        return {
            ok: false,
            reason: "NO_MATCH",
            ...failure
        };
    }
    await clearAuthLock(name, phone);
    return {
        ok: true,
        user: parseUserContentProfile(found)
    };
}

async function getSessionRows(sheets) {
    const cached = getCached("sessionRows");
    if (cached) return cached;
    await ensureSessionHeader(sheets);
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: rangeFor("session", "A2:L")
    });
    const values = res.data.values || [];
    const rows = values.map((r, idx) => ({
        rowNumber: idx + 2,
        sessionId: r[0] || "",
        userId: r[1] || "",
        name: r[2] || "",
        phone: r[3] || "",
        loginIst: r[4] || "",
        loginMs: Number(r[5] || 0),
        logoutIst: r[6] || "",
        logoutMs: Number(r[7] || 0),
        durationSec: Number(r[8] || 0),
        screenTimeSec: Number(r[9] || 0),
        lastSeenIst: r[10] || "",
        status: r[11] || ""
    }));
    setCached("sessionRows", rows);
    return rows;
}

async function createUserSession(user) {
    const sheets = await getSheets();
    const now = Date.now();
    const sessionId = crypto.randomUUID();
    const row = [[
        sessionId,
        user.userId,
        user.name,
        user.phone,
        formatIst(now),
        now,
        "",
        "",
        "",
        0,
        formatIst(now),
        "ACTIVE"
    ]];
    await ensureSessionHeader(sheets);
    await sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: rangeFor("session", "A:L"),
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: row }
    });
    invalidateCache("sessionRows");
    return { sessionId, createdAtMs: now };
}

async function getSessionById(sessionId) {
    if (!sessionId) return null;
    const sheets = await getSheets();
    const rows = await getSessionRows(sheets);
    const found = rows.find((r) => r.sessionId === sessionId && r.status === "ACTIVE") || null;
    if (!found) return null;
    const now = Date.now();
    const maxAgeMs = Math.max(1, SESSION_MAX_HOURS) * 60 * 60 * 1000;
    if (Number(found.loginMs || 0) > 0 && (now - Number(found.loginMs || 0)) >= maxAgeMs) {
        await closeSession(found.sessionId, 0);
        return null;
    }
    return found;
}

async function touchSession(sessionId) {
    const session = await getSessionById(sessionId);
    if (!session) return null;
    const sheets = await getSheets();
    const now = Date.now();
    await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: rangeFor("session", `K${session.rowNumber}:K${session.rowNumber}`),
        valueInputOption: "RAW",
        requestBody: { values: [[formatIst(now)]] }
    });
    invalidateCache("sessionRows");
    return { ...session, lastSeenIst: formatIst(now) };
}

async function closeSession(sessionId, screenTimeSec = 0) {
    const session = await getSessionById(sessionId);
    if (!session) return null;
    const sheets = await getSheets();
    const now = Date.now();
    const durationSec = Math.max(0, Math.floor((now - (session.loginMs || now)) / 1000));
    await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: rangeFor("session", `G${session.rowNumber}:L${session.rowNumber}`),
        valueInputOption: "RAW",
        requestBody: {
            values: [[
                formatIst(now),
                now,
                durationSec,
                Math.max(0, Number(screenTimeSec || 0)),
                formatIst(now),
                "LOGGED_OUT"
            ]]
        }
    });
    invalidateCache("sessionRows");
    return { ...session, logoutMs: now, durationSec };
}

function readSessionIdFromHeaders(headers) {
    const cookies = parseCookies(headers && (headers.cookie || headers.Cookie));
    return cookies[SESSION_COOKIE] || "";
}

async function getAuthenticatedSession(headers) {
    const sessionId = readSessionIdFromHeaders(headers);
    if (!sessionId) return null;
    const session = await getSessionById(sessionId);
    if (!session) return null;
    const user = await getUserById(session.userId);
    if (!user) return null;
    return {
        sessionId: session.sessionId,
        userId: session.userId,
        name: user.name,
        phone: user.phone,
        pageTitle: user.pageTitle,
        contentProfile: user.contentProfile
    };
}

function buildSessionCookie(sessionId) {
    return `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`;
}

function clearSessionCookie() {
    return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

async function getStoreRows(sheets) {
    const cached = getCached("storeRows");
    if (cached) return cached;
    await ensureStoreHeader(sheets);
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: rangeFor("store", "A2:C")
    });
    const values = res.data.values || [];
    const rows = values.map((r, idx) => ({
        rowNumber: idx + 2,
        clientId: r[0] || "",
        updatedAt: Number(r[1] || 0),
        stateJson: r[2] || "{}"
    }));
    setCached("storeRows", rows);
    return rows;
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
            range: rangeFor("store", `A${existing.rowNumber}:C${existing.rowNumber}`),
            valueInputOption: "RAW",
            requestBody: { values: payload }
        });
    } else {
        await sheets.spreadsheets.values.append({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: rangeFor("store", "A:C"),
            valueInputOption: "RAW",
            insertDataOption: "INSERT_ROWS",
            requestBody: { values: payload }
        });
    }
    invalidateCache("storeRows");
    if (AUTO_SYNC_ON_SAVE) {
        const now = Date.now();
        if ((now - lastAutoSyncMs) >= AUTO_SYNC_MIN_INTERVAL_MS) {
            lastAutoSyncMs = now;
            syncAdminTabFromStore().catch((err) => {
                console.error("Auto sync failed:", err && err.message ? err.message : err);
            });
        }
    }
    return normalized;
}

function toIso(ms) {
    if (!ms || Number.isNaN(Number(ms))) return "";
    return formatIst(ms);
}

function formatIst(ms) {
    if (!ms || Number.isNaN(Number(ms))) return "";
    try {
        return IST_FORMATTER.format(new Date(Number(ms))).replace(",", "");
    } catch (err) {
        return "";
    }
}

async function buildAdminTable(sheets, states) {
    const headers = [
        "user_id",
        "name",
        "phone",
        "active_status",
        "page_title",
        "content_json",
        "last_updated",
        "tutorial_seen",
        "progress",
        "progress_percent",
        "unlocked_chests",
        "pending_target_chest",
        "pending_key_revealed",
        "last_key_generated",
        "feedback",
        "content_access_times",
        "theme",
        "color_scheme",
        "highlight",
        "state_data",
        "access_date_time_ist",
        "session_id",
        "session_duration",
        "screen_time",
        "event_log"
    ];

    const loginRows = await getLoginRows(sheets);
    const sessionRows = await getSessionRows(sheets);
    const accessRows = await getAccessRows(sheets);
    const feedbackRows = await getFeedbackRows(sheets);

    const stateByUser = new Map(states.map((entry) => [String(entry.clientId || ""), entry]));
    const loginByUser = new Map(loginRows.map((row) => [String(row.userId || ""), row]));

    const latestSessionByUser = new Map();
    for (const row of sessionRows) {
        const userId = String(row.userId || "");
        if (!userId) continue;
        const prev = latestSessionByUser.get(userId);
        if (!prev || Number(row.loginMs || 0) >= Number(prev.loginMs || 0)) {
            latestSessionByUser.set(userId, row);
        }
    }

    const latestAccessByUser = new Map();
    const eventLogByUser = new Map();
    for (const row of accessRows) {
        const userId = String(row.userId || "");
        if (!userId) continue;
        const prev = latestAccessByUser.get(userId);
        if (!prev || Number(row.atMs || 0) >= Number(prev.atMs || 0)) {
            latestAccessByUser.set(userId, row);
        }
        const eventCounts = eventLogByUser.get(userId) || {};
        const key = String(row.event || "unknown").trim() || "unknown";
        eventCounts[key] = (eventCounts[key] || 0) + 1;
        eventLogByUser.set(userId, eventCounts);
    }

    const latestFeedbackByUser = new Map();
    for (const row of feedbackRows) {
        const userId = String(row.userId || "");
        if (!userId) continue;
        const prev = latestFeedbackByUser.get(userId);
        if (!prev || Number(row.submittedAtMs || 0) >= Number(prev.submittedAtMs || 0)) {
            latestFeedbackByUser.set(userId, row);
        }
    }

    const allUserIds = Array.from(new Set([
        ...Array.from(stateByUser.keys()),
        ...Array.from(loginByUser.keys())
    ])).filter(Boolean);

    const rows = allUserIds.map((userId) => {
        const entry = stateByUser.get(userId) || { clientId: userId, updatedAt: 0, state: withStateDefaults(null) };
        const login = loginByUser.get(userId) || null;
        const latestSession = latestSessionByUser.get(userId) || null;
        const latestAccess = latestAccessByUser.get(userId) || null;
        const latestFeedback = latestFeedbackByUser.get(userId) || null;
        const eventCounts = eventLogByUser.get(userId) || {};
        const eventLog = Object.keys(eventCounts).sort().map((k) => `${k}:${eventCounts[k]}`).join(" | ");

        const s = entry.state || withStateDefaults(null);
        const allChests = Array.isArray(s.chests) ? s.chests : [];
        const unlockedChestIds = allChests.filter((c) => c && c.isLocked === false).map((c) => c.id);
        const unlocked = unlockedChestIds.length;
        const total = allChests.length;
        const progress = total > 0 ? `${unlocked}/${total}` : "0/0";
        const progressPercent = total > 0 ? unlocked / total : 0;
        const feedback = (() => {
            if (latestFeedback && latestFeedback.feedbackText) {
                const tag = latestFeedback.reaction ? `${latestFeedback.reaction}: ` : "";
                const at = latestFeedback.submittedAtIst || formatIst(latestFeedback.submittedAtMs);
                return at ? `${tag}${latestFeedback.feedbackText} (${at})` : `${tag}${latestFeedback.feedbackText}`;
            }
            if (!s.feedbackSent) return "";
            if (typeof s.feedbackSent === "string") return s.feedbackSent;
            if (typeof s.feedbackSent === "object") {
                const t = s.feedbackSent.type || "";
                const at = formatIst(s.feedbackSent.at);
                return at ? `${t} (${at})` : t;
            }
            return "";
        })();
        return [
            userId,
            login ? login.name : "",
            login ? login.phone : "",
            login ? login.isActive : "",
            login ? login.pageTitle : "",
            login ? login.contentJson : "",
            toIso(entry.updatedAt),
            s.tutorialSeen ? "Yes" : "No",
            progress,
            progressPercent,
            unlockedChestIds.join(", "),
            s.pendingKey ? (s.pendingKey.targetChestId || "") : "",
            s.pendingKey ? (s.pendingKey.isRevealed ? "Yes" : "No") : "",
            toIso(s.lastGenerationTime),
            feedback,
            JSON.stringify(s.contentAccessTimes || {}),
            s.ui && s.ui.theme ? s.ui.theme : "",
            s.ui && s.ui.colorScheme ? s.ui.colorScheme : "",
            s.ui && s.ui.highlight ? s.ui.highlight : "",
            JSON.stringify(s || {}),
            latestAccess ? (latestAccess.atIst || formatIst(latestAccess.atMs)) : "",
            latestSession ? latestSession.sessionId : "",
            latestSession ? Number(latestSession.durationSec || 0) : "",
            latestSession ? Number(latestSession.screenTimeSec || 0) : "",
            eventLog
        ];
    });

    return { headers, rows };
}

async function syncAdminTabFromStore() {
    const sheets = await getSheets();
    const states = await listClientStates();
    const table = await buildAdminTable(sheets, states);

    const adminSheetId = await ensureTab(sheets, ADMIN_TAB);
    await sheets.spreadsheets.values.clear({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: rangeFor("admin", "A:Z")
    });
    await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: rangeFor("admin", "A1"),
        valueInputOption: "RAW",
        requestBody: {
            values: [table.headers, ...table.rows]
        }
    });
    await formatAdminTab(sheets, adminSheetId, table.rows.length, table.headers.length);
    await clearAdminConditionalRules(sheets, adminSheetId);
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: GOOGLE_SHEET_ID,
        requestBody: {
            requests: [
                {
                    addConditionalFormatRule: {
                        index: 0,
                        rule: {
                            ranges: [{ sheetId: adminSheetId, startRowIndex: 1, startColumnIndex: 7, endColumnIndex: 8 }],
                            booleanRule: {
                                condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "Yes" }] },
                                format: { backgroundColor: DASH_COLORS.successSoft, textFormat: { bold: true, foregroundColor: DASH_COLORS.success } }
                            }
                        }
                    }
                },
                {
                    addConditionalFormatRule: {
                        index: 1,
                        rule: {
                            ranges: [{ sheetId: adminSheetId, startRowIndex: 1, startColumnIndex: 12, endColumnIndex: 13 }],
                            booleanRule: {
                                condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "Yes" }] },
                                format: { backgroundColor: DASH_COLORS.infoSoft, textFormat: { bold: true, foregroundColor: DASH_COLORS.info } }
                            }
                        }
                    }
                },
                {
                    addConditionalFormatRule: {
                        index: 2,
                        rule: {
                            ranges: [{ sheetId: adminSheetId, startRowIndex: 1, startColumnIndex: 9, endColumnIndex: 10 }],
                            gradientRule: {
                                minpoint: { type: "NUMBER", value: "0", color: rgb(1.0, 0.93, 0.93) },
                                midpoint: { type: "NUMBER", value: "0.5", color: rgb(1.0, 0.97, 0.85) },
                                maxpoint: { type: "NUMBER", value: "1", color: rgb(0.88, 0.97, 0.92) }
                            }
                        }
                    }
                }
            ]
        }
    });
    await syncDashboardTab(sheets, states);
    await formatSingleSheetSections(sheets);
    await formatStructuredTabs(sheets);
    return { ok: true, syncedRows: table.rows.length };
}

function csvEscape(value) {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, "\"\"")}"`;
    return str;
}

async function buildAdminCsv(states) {
    const sheets = await getSheets();
    const table = await buildAdminTable(sheets, states);
    const lines = [table.headers.map(csvEscape).join(",")];
    for (const row of table.rows) lines.push(row.map(csvEscape).join(","));
    return `${lines.join("\n")}\n`;
}

function toMs(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
}

function dayKeyFromMs(ms) {
    if (!ms) return "";
    const d = new Date(ms);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

async function getAccessRows(sheets) {
    await ensureAccessHeader(sheets);
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: rangeFor("access", "A2:E")
    });
    const values = res.data.values || [];
    return values.map((r) => ({
        atIst: String(r[0] || ""),
        atMs: Number(r[1] || 0),
        userId: String(r[2] || ""),
        sessionId: String(r[3] || ""),
        event: String(r[4] || "")
    }));
}

async function getFeedbackRows(sheets) {
    await ensureFeedbackHeader(sheets);
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: rangeFor("feedback", "A2:H")
    });
    const values = res.data.values || [];
    return values.map((r) => ({
        submittedAtIst: String(r[0] || ""),
        submittedAtMs: Number(r[1] || 0),
        userId: String(r[2] || ""),
        name: String(r[3] || ""),
        phone: String(r[4] || ""),
        sessionId: String(r[5] || ""),
        reaction: String(r[6] || ""),
        feedbackText: String(r[7] || "")
    }));
}

async function getAdminAnalytics({ fromMs = 0, toMs: endMs = 0, userId = "" } = {}) {
    const sheets = await getSheets();
    const states = await listClientStates();
    const sessions = await getSessionRows(sheets);
    const access = await getAccessRows(sheets);
    const from = Number(fromMs || 0);
    const to = Number(endMs || 0);
    const hasRange = !!(from || to);
    const userFilter = String(userId || "").trim();

    const inRange = (ms) => {
        if (!hasRange) return true;
        if (!ms) return false;
        if (from && ms < from) return false;
        if (to && ms > to) return false;
        return true;
    };

    const sessionsFiltered = sessions.filter((s) => {
        if (userFilter && s.userId !== userFilter) return false;
        return inRange(toMs(s.loginMs));
    });

    const accessFiltered = access.filter((a) => {
        if (userFilter && a.userId !== userFilter) return false;
        return inRange(toMs(a.atMs));
    });

    const userSet = new Set(sessionsFiltered.map((s) => s.userId).filter(Boolean));
    const totalSessions = sessionsFiltered.length;
    const activeSessions = sessionsFiltered.filter((s) => (s.status || "").toUpperCase() === "ACTIVE").length;
    const totalScreenSec = sessionsFiltered.reduce((sum, s) => sum + Number(s.screenTimeSec || 0), 0);
    const avgDurationSec = totalSessions
        ? Math.round(sessionsFiltered.reduce((sum, s) => sum + Number(s.durationSec || 0), 0) / totalSessions)
        : 0;
    const feedbackCount = states.filter((st) => !!(st.state && st.state.feedbackSent)).length;

    const sessionsByDay = {};
    const screenByDay = {};
    for (const s of sessionsFiltered) {
        const day = dayKeyFromMs(toMs(s.loginMs));
        if (!day) continue;
        sessionsByDay[day] = (sessionsByDay[day] || 0) + 1;
        screenByDay[day] = (screenByDay[day] || 0) + Number(s.screenTimeSec || 0);
    }

    const eventsByType = {};
    for (const ev of accessFiltered) {
        const k = ev.event || "unknown";
        eventsByType[k] = (eventsByType[k] || 0) + 1;
    }

    const sessionRows = sessionsFiltered.map((s) => ({
        sessionId: s.sessionId,
        userId: s.userId,
        name: s.name,
        phone: s.phone,
        loginTimeIst: s.loginIst,
        logoutTimeIst: s.logoutIst,
        durationSec: Number(s.durationSec || 0),
        screenTimeSec: Number(s.screenTimeSec || 0),
        status: s.status || ""
    }));

    return {
        filters: { fromMs: from || 0, toMs: to || 0, userId: userFilter || "" },
        summary: {
            usersActiveInRange: userSet.size,
            totalSessions,
            activeSessions,
            avgDurationSec,
            totalScreenSec,
            totalEvents: accessFiltered.length,
            feedbackCount
        },
        chart: {
            sessionsByDay,
            screenByDay,
            eventsByType
        },
        rows: {
            sessions: sessionRows
        }
    };
}

function buildSessionsCsv(rows) {
    const headers = [
        "session_id",
        "user_id",
        "name",
        "phone",
        "login_time_ist",
        "logout_time_ist",
        "duration_sec",
        "screen_time_sec",
        "status"
    ];
    const lines = [headers.join(",")];
    for (const r of rows) {
        lines.push([
            r.sessionId,
            r.userId,
            r.name,
            r.phone,
            r.loginTimeIst,
            r.logoutTimeIst,
            r.durationSec,
            r.screenTimeSec,
            r.status
        ].map(csvEscape).join(","));
    }
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
    ACCESS_TAB,
    FEEDBACK_TAB,
    LOGIN_TAB,
    SESSION_TAB,
    buildAdminCsv,
    buildSessionsCsv,
    buildSessionCookie,
    checkAdmin,
    clearSessionCookie,
    closeSession,
    appendFeedbackEntry,
    defaultState,
    ensureClientId,
    getAuthenticatedSession,
    getAdminAnalytics,
    getClientState,
    getUserById,
    json,
    logAccessEvent,
    listClientStates,
    createUserSession,
    deleteLoginUser,
    syncAdminTabFromStore,
    listLoginUsers,
    touchSession,
    upsertLoginUser,
    upsertClientState,
    verifyLoginIdentity,
    withStateDefaults
};
