"use strict";

const {
    getAuthenticatedSession,
    getClientState,
    json,
    logAccessEvent,
    touchSession,
    upsertClientState,
    withStateDefaults
} = require("./_lib/sheetsStore");

exports.handler = async (event) => {
    try {
        const session = await getAuthenticatedSession(event.headers || {});
        if (!session) {
            return json(401, { ok: false, error: "Please login first." });
        }
        await touchSession(session.sessionId);

        if (event.httpMethod === "GET") {
            try {
                await logAccessEvent(session.userId, "visit", session.sessionId);
            } catch (err) {
                // Never block page access on logging failures.
                console.error("Access log failed:", err.message || err);
            }
            const saved = await getClientState(session.userId);
            const state = withStateDefaults(saved);
            if (!saved) await upsertClientState(session.userId, state);
            return json(200, {
                ok: true,
                state,
                user: {
                    userId: session.userId,
                    name: session.name,
                    phone: session.phone,
                    pageTitle: session.pageTitle,
                    contentProfile: session.contentProfile
                }
            });
        }

        if (event.httpMethod === "POST") {
            const parsed = event.body ? JSON.parse(event.body) : {};
            const next = await upsertClientState(session.userId, parsed.state);
            await logAccessEvent(session.userId, "state_save", session.sessionId);
            return json(200, { ok: true, state: next });
        }

        return json(405, { ok: false, error: "Method not allowed" });
    } catch (err) {
        return json(400, { ok: false, error: err.message || "Invalid request" });
    }
};
