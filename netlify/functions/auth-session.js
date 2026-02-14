"use strict";

const { getAuthenticatedSession, json, logAccessEvent, touchSession } = require("./_lib/sheetsStore");

exports.handler = async (event) => {
    if (event.httpMethod !== "GET") {
        return json(405, { ok: false, error: "Method not allowed" });
    }
    try {
        const session = await getAuthenticatedSession(event.headers || {});
        if (!session) {
            return json(200, { ok: true, authenticated: false });
        }
        await touchSession(session.sessionId);
        await logAccessEvent(session.userId, "session_check", session.sessionId);
        return json(200, {
            ok: true,
            authenticated: true,
            user: {
                userId: session.userId,
                name: session.name,
                phone: session.phone,
                pageTitle: session.pageTitle,
                contentProfile: session.contentProfile
            }
        });
    } catch (err) {
        return json(500, { ok: false, error: err.message || "Session check failed" });
    }
};
