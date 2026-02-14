"use strict";

const { defaultState, ensureClientId, json, upsertClientState } = require("./_lib/sheetsStore");

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return json(405, { ok: false, error: "Method not allowed" });
    }

    try {
        const { clientId, setCookie } = ensureClientId(event.headers || {});
        await upsertClientState(clientId, defaultState());
        const headers = setCookie ? { "set-cookie": setCookie } : {};
        return json(200, { ok: true }, headers);
    } catch (err) {
        return json(500, { ok: false, error: err.message || "Reset failed" });
    }
};
