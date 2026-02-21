"use strict";

const {
    appendFeedbackEntry,
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
            return json(401, { ok: false, error: "Please login first." });
        }

        const body = event.body ? JSON.parse(event.body) : {};
        const feedback = String(body.feedback || "").trim();
        const reaction = String(body.reaction || "").trim();
        if (!feedback) {
            return json(400, { ok: false, error: "Feedback text is required." });
        }
        if (feedback.length > 2000) {
            return json(400, { ok: false, error: "Feedback is too long (max 2000 chars)." });
        }

        await appendFeedbackEntry({
            userId: session.userId,
            name: session.name,
            phone: session.phone,
            sessionId: session.sessionId,
            reaction,
            feedbackText: feedback
        });
        await logAccessEvent(session.userId, "feedback", session.sessionId);

        return json(200, { ok: true });
    } catch (err) {
        return json(500, { ok: false, error: err.message || "Feedback submit failed" });
    }
};

