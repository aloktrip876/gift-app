"use strict";

const { google } = require("googleapis");
const crypto = require("crypto");

const STORE_TAB = process.env.GOOGLE_STATE_TAB || "StateStore";
const ADMIN_TAB = process.env.GOOGLE_SHEET_TAB || "States";
const DASHBOARD_TAB = process.env.GOOGLE_DASHBOARD_TAB || "Dashboard";
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

function rgb(r, g, b) {
    return { red: r, green: g, blue: b };
}

async function formatAdminTab(sheets, sheetId, rowCount, colCount) {
    const safeRows = Math.max(rowCount, 1);
    const requests = [
        {
            updateSheetProperties: {
                properties: {
                    sheetId,
                    gridProperties: { frozenRowCount: 1 }
                },
                fields: "gridProperties.frozenRowCount"
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
                        backgroundColor: rgb(0.20, 0.14, 0.45),
                        textFormat: { bold: true, foregroundColor: rgb(1, 1, 1) },
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
                        backgroundColor: rgb(0.97, 0.97, 1),
                        textFormat: { foregroundColor: rgb(0.13, 0.13, 0.13) },
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
                        textFormat: { bold: true, foregroundColor: rgb(0.20, 0.14, 0.45) }
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
            updateBorders: {
                range: {
                    sheetId,
                    startRowIndex: 0,
                    endRowIndex: safeRows + 1,
                    startColumnIndex: 0,
                    endColumnIndex: colCount
                },
                top: { style: "SOLID", color: rgb(0.72, 0.72, 0.82) },
                bottom: { style: "SOLID", color: rgb(0.72, 0.72, 0.82) },
                left: { style: "SOLID", color: rgb(0.72, 0.72, 0.82) },
                right: { style: "SOLID", color: rgb(0.72, 0.72, 0.82) },
                innerHorizontal: { style: "SOLID", color: rgb(0.88, 0.88, 0.94) },
                innerVertical: { style: "SOLID", color: rgb(0.88, 0.88, 0.94) }
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

async function syncDashboardTab(sheets, states) {
    const dashboardSheetId = await ensureTab(sheets, DASHBOARD_TAB);
    const adminRef = `'${ADMIN_TAB.replace(/'/g, "''")}'`;
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
        range: `${DASHBOARD_TAB}!A:K`
    });
    await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${DASHBOARD_TAB}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [
                ["Shreya Secret Chests - Admin Dashboard"],
                [""],
                ["Metric", "Value", "", "Progress Graph", "", "", "Theme Split", ""],
                ["Total Users", totalUsers, "", `=SPARKLINE(${adminRef}!E2:E,{"charttype","column";"color","#5e35b1"})`, "", "", "Dark", `=COUNTIF(${adminRef}!K2:K,"dark")`],
                ["Average Progress", avgProgress, "", "", "", "", "Light", `=COUNTIF(${adminRef}!K2:K,"light")`],
                ["Completed Users", completedUsers],
                ["Users With Pending Key", pendingUsers],
                ["Feedback Given", feedbackGiven]
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
                    repeatCell: {
                        range: { sheetId: dashboardSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: rgb(0.16, 0.11, 0.37),
                                textFormat: { bold: true, fontSize: 14, foregroundColor: rgb(1, 1, 1) },
                                horizontalAlignment: "CENTER"
                            }
                        },
                        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
                    }
                },
                {
                    repeatCell: {
                        range: { sheetId: dashboardSheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 8 },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: rgb(0.90, 0.90, 0.98),
                                textFormat: { bold: true, foregroundColor: rgb(0.20, 0.14, 0.45) }
                            }
                        },
                        fields: "userEnteredFormat(backgroundColor,textFormat)"
                    }
                },
                {
                    repeatCell: {
                        range: { sheetId: dashboardSheetId, startRowIndex: 3, endRowIndex: 8, startColumnIndex: 0, endColumnIndex: 2 },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: rgb(0.98, 0.98, 1),
                                textFormat: { foregroundColor: rgb(0.1, 0.1, 0.1) }
                            }
                        },
                        fields: "userEnteredFormat(backgroundColor,textFormat)"
                    }
                },
                {
                    repeatCell: {
                        range: { sheetId: dashboardSheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 1, endColumnIndex: 2 },
                        cell: { userEnteredFormat: { numberFormat: { type: "PERCENT", pattern: "0.0%" } } },
                        fields: "userEnteredFormat.numberFormat"
                    }
                },
                {
                    updateBorders: {
                        range: { sheetId: dashboardSheetId, startRowIndex: 2, endRowIndex: 8, startColumnIndex: 0, endColumnIndex: 8 },
                        top: { style: "SOLID", color: rgb(0.75, 0.75, 0.82) },
                        bottom: { style: "SOLID", color: rgb(0.75, 0.75, 0.82) },
                        left: { style: "SOLID", color: rgb(0.75, 0.75, 0.82) },
                        right: { style: "SOLID", color: rgb(0.75, 0.75, 0.82) },
                        innerHorizontal: { style: "SOLID", color: rgb(0.90, 0.90, 0.95) },
                        innerVertical: { style: "SOLID", color: rgb(0.90, 0.90, 0.95) }
                    }
                },
                {
                    autoResizeDimensions: {
                        dimensions: {
                            sheetId: dashboardSheetId,
                            dimension: "COLUMNS",
                            startIndex: 0,
                            endIndex: 8
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
    const requests = [];
    for (let i = count - 1; i >= 0; i--) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: GOOGLE_SHEET_ID,
            requestBody: {
                requests: [{ deleteConditionalFormatRule: { sheetId, index: i } }]
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
        "last_updated",
        "tutorial_seen",
        "progress",
        "progress_percent",
        "unlocked_chests",
        "pending_target_chest",
        "pending_key_revealed",
        "last_key_generated",
        "feedback",
        "theme",
        "color_scheme",
        "highlight"
    ];

    const rows = states.map((entry) => {
        const s = entry.state || withStateDefaults(null);
        const allChests = Array.isArray(s.chests) ? s.chests : [];
        const unlockedChestIds = allChests.filter((c) => c && c.isLocked === false).map((c) => c.id);
        const unlocked = unlockedChestIds.length;
        const total = allChests.length;
        const progress = total > 0 ? `${unlocked}/${total}` : "0/0";
        const progressPercent = total > 0 ? unlocked / total : 0;
        return [
            entry.clientId,
            toIso(entry.updatedAt),
            s.tutorialSeen ? "Yes" : "No",
            progress,
            progressPercent,
            unlockedChestIds.join(", "),
            s.pendingKey ? (s.pendingKey.targetChestId || "") : "",
            s.pendingKey ? (s.pendingKey.isRevealed ? "Yes" : "No") : "",
            toIso(s.lastGenerationTime),
            s.feedbackSent || "",
            s.ui && s.ui.theme ? s.ui.theme : "",
            s.ui && s.ui.colorScheme ? s.ui.colorScheme : "",
            s.ui && s.ui.highlight ? s.ui.highlight : ""
        ];
    });

    return { headers, rows };
}

async function syncAdminTabFromStore() {
    const sheets = await getSheets();
    const states = await listClientStates();
    const table = buildAdminTable(states);

    const adminSheetId = await ensureTab(sheets, ADMIN_TAB);
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
                            ranges: [{ sheetId: adminSheetId, startRowIndex: 1, startColumnIndex: 2, endColumnIndex: 3 }],
                            booleanRule: {
                                condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "Yes" }] },
                                format: { backgroundColor: rgb(0.84, 0.94, 0.86), textFormat: { bold: true, foregroundColor: rgb(0.1, 0.35, 0.14) } }
                            }
                        }
                    }
                },
                {
                    addConditionalFormatRule: {
                        index: 1,
                        rule: {
                            ranges: [{ sheetId: adminSheetId, startRowIndex: 1, startColumnIndex: 7, endColumnIndex: 8 }],
                            booleanRule: {
                                condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "Yes" }] },
                                format: { backgroundColor: rgb(0.92, 0.97, 1), textFormat: { bold: true, foregroundColor: rgb(0.08, 0.23, 0.45) } }
                            }
                        }
                    }
                }
            ]
        }
    });
    await syncDashboardTab(sheets, states);
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
