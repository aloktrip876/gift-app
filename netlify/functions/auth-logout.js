"use strict";

const {
    clearSessionCookie,
    closeSession,
    getAuthenticatedSession,
    json,
    logAccessEvent
} = require("./_lib/sheetsStore");

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return json(405, { ok: false, error: "Method not allowed" });
    }
    try {
        const session = await getAuthenticatedSession(event.headers || {});
        if (!session) {
            return json(200, { ok: true }, { "set-cookie": clearSessionCookie() });
        }
        const body = event.body ? JSON.parse(event.body) : {};
        const screenTimeSec = Number(body.screenTimeSec || 0);
        await closeSession(session.sessionId, screenTimeSec);
        await logAccessEvent(session.userId, "logout", session.sessionId);
        return json(200, { ok: true }, { "set-cookie": clearSessionCookie() });
    } catch (err) {
        return json(500, { ok: false, error: err.message || "Logout failed" });
    }
};
