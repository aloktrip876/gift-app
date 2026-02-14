"use strict";

const { getAuthenticatedSession, json, logAccessEvent, touchSession } = require("./_lib/sheetsStore");

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return json(405, { ok: false, error: "Method not allowed" });
    }
    try {
        const session = await getAuthenticatedSession(event.headers || {});
        if (!session) return json(401, { ok: false, error: "Please login first." });
        await touchSession(session.sessionId);
        await logAccessEvent(session.userId, "heartbeat", session.sessionId);
        return json(200, { ok: true });
    } catch (err) {
        return json(500, { ok: false, error: err.message || "Heartbeat failed" });
    }
};
