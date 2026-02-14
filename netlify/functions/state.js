"use strict";

const {
    ensureClientId,
    getClientState,
    json,
    logAccessEvent,
    upsertClientState,
    withStateDefaults
} = require("./_lib/sheetsStore");

exports.handler = async (event) => {
    try {
        const { clientId, setCookie } = ensureClientId(event.headers || {});
        const cookieHeader = setCookie ? { "set-cookie": setCookie } : {};

        if (event.httpMethod === "GET") {
            try {
                await logAccessEvent(clientId, "visit");
            } catch (err) {
                // Never block page access on logging failures.
                console.error("Access log failed:", err.message || err);
            }
            const saved = await getClientState(clientId);
            const state = withStateDefaults(saved);
            if (!saved) await upsertClientState(clientId, state);
            return json(200, { state }, cookieHeader);
        }

        if (event.httpMethod === "POST") {
            const parsed = event.body ? JSON.parse(event.body) : {};
            const next = await upsertClientState(clientId, parsed.state);
            return json(200, { ok: true, state: next }, cookieHeader);
        }

        return json(405, { ok: false, error: "Method not allowed" }, cookieHeader);
    } catch (err) {
        return json(400, { ok: false, error: err.message || "Invalid request" });
    }
};
