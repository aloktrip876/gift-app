"use strict";

const { checkAdmin, getAdminAnalytics, json } = require("./_lib/sheetsStore");

function parseMs(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
}

exports.handler = async (event) => {
    if (event.httpMethod !== "GET") {
        return json(405, { ok: false, error: "Method not allowed" });
    }
    if (!checkAdmin(event.headers || {}, event.queryStringParameters || {})) {
        return json(401, { ok: false, error: "Unauthorized" });
    }
    try {
        const q = event.queryStringParameters || {};
        const analytics = await getAdminAnalytics({
            fromMs: parseMs(q.fromMs),
            toMs: parseMs(q.toMs),
            userId: q.userId || ""
        });
        return json(200, { ok: true, analytics });
    } catch (err) {
        return json(500, { ok: false, error: err.message || "Analytics failed" });
    }
};
