"use strict";

const { buildSessionsCsv, checkAdmin, getAdminAnalytics } = require("./_lib/sheetsStore");

function parseMs(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
}

exports.handler = async (event) => {
    if (event.httpMethod !== "GET") {
        return {
            statusCode: 405,
            headers: { "content-type": "application/json; charset=utf-8" },
            body: JSON.stringify({ ok: false, error: "Method not allowed" })
        };
    }
    if (!checkAdmin(event.headers || {}, event.queryStringParameters || {})) {
        return {
            statusCode: 401,
            headers: { "content-type": "application/json; charset=utf-8" },
            body: JSON.stringify({ ok: false, error: "Unauthorized" })
        };
    }
    try {
        const q = event.queryStringParameters || {};
        const analytics = await getAdminAnalytics({
            fromMs: parseMs(q.fromMs),
            toMs: parseMs(q.toMs),
            userId: q.userId || ""
        });
        const csv = buildSessionsCsv(analytics.rows.sessions || []);
        return {
            statusCode: 200,
            headers: {
                "content-type": "text/csv; charset=utf-8",
                "content-disposition": "attachment; filename=\"session-analytics.csv\""
            },
            body: csv
        };
    } catch (err) {
        return {
            statusCode: 500,
            headers: { "content-type": "application/json; charset=utf-8" },
            body: JSON.stringify({ ok: false, error: err.message || "CSV export failed" })
        };
    }
};
