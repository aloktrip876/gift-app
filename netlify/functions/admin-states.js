"use strict";

const { checkAdmin, json, listClientStates } = require("./_lib/sheetsStore");

exports.handler = async (event) => {
    if (event.httpMethod !== "GET") {
        return json(405, { ok: false, error: "Method not allowed" });
    }
    if (!checkAdmin(event.headers || {}, event.queryStringParameters || {})) {
        return json(401, { ok: false, error: "Unauthorized" });
    }

    try {
        const states = await listClientStates();
        return json(200, { ok: true, count: states.length, clients: states });
    } catch (err) {
        return json(500, { ok: false, error: err.message || "Failed to fetch states" });
    }
};
