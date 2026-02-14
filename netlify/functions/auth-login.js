"use strict";

const {
    buildSessionCookie,
    createUserSession,
    json,
    logAccessEvent,
    verifyLoginIdentity
} = require("./_lib/sheetsStore");

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return json(405, { ok: false, error: "Method not allowed" });
    }

    try {
        const body = event.body ? JSON.parse(event.body) : {};
        const name = String(body.name || "").trim();
        const phone = String(body.phone || "").trim();
        if (!name || !phone) {
            return json(400, { ok: false, error: "Name and phone are required." });
        }

        const check = await verifyLoginIdentity(name, phone);
        if (!check || !check.ok) {
            if (check && check.reason === "LOCKED") {
                return json(429, {
                    ok: false,
                    error: "Too many failed attempts. Try later.",
                    lockUntilIst: check.lockUntilIst || "",
                    retryAfterSec: check.retryAfterSec || 0
                });
            }
            return json(401, {
                ok: false,
                error: "Verification failed.",
                attemptsLeft: check && typeof check.attemptsLeft === "number" ? check.attemptsLeft : undefined
            });
        }
        const user = check.user;

        const session = await createUserSession(user);
        await logAccessEvent(user.userId, "login", session.sessionId);

        return json(200, {
            ok: true,
            user: {
                userId: user.userId,
                name: user.name,
                phone: user.phone,
                pageTitle: user.pageTitle,
                contentProfile: user.contentProfile
            }
        }, {
            "set-cookie": buildSessionCookie(session.sessionId)
        });
    } catch (err) {
        return json(500, { ok: false, error: err.message || "Login failed" });
    }
};
