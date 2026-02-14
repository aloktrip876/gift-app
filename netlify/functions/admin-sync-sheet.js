"use strict";

const { checkAdmin, json, syncAdminTabFromStore } = require("./_lib/sheetsStore");

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return json(405, { ok: false, error: "Method not allowed" });
    }
    if (!checkAdmin(event.headers || {}, event.queryStringParameters || {})) {
        return json(401, { ok: false, error: "Unauthorized" });
    }

    try {
        const result = await syncAdminTabFromStore();
        return json(200, result);
    } catch (err) {
        return json(500, { ok: false, error: err.message || "Sync failed" });
    }
};
