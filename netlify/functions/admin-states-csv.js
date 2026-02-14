"use strict";

const { buildAdminCsv, checkAdmin, listClientStates } = require("./_lib/sheetsStore");

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
        const states = await listClientStates();
        const csv = buildAdminCsv(states);
        return {
            statusCode: 200,
            headers: {
                "content-type": "text/csv; charset=utf-8",
                "content-disposition": "attachment; filename=\"states.csv\""
            },
            body: csv
        };
    } catch (err) {
        return {
            statusCode: 500,
            headers: { "content-type": "application/json; charset=utf-8" },
            body: JSON.stringify({ ok: false, error: err.message || "Failed to build CSV" })
        };
    }
};
