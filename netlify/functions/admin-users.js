"use strict";

const { checkAdmin, deleteLoginUser, json, listLoginUsers, upsertLoginUser } = require("./_lib/sheetsStore");

exports.handler = async (event) => {
    if (!checkAdmin(event.headers || {}, event.queryStringParameters || {})) {
        return json(401, { ok: false, error: "Unauthorized" });
    }

    try {
        if (event.httpMethod === "GET") {
            const users = await listLoginUsers();
            return json(200, { ok: true, count: users.length, users });
        }

        if (event.httpMethod === "POST") {
            const body = event.body ? JSON.parse(event.body) : {};
            const user = await upsertLoginUser(body.user || {});
            return json(200, { ok: true, user });
        }

        if (event.httpMethod === "DELETE") {
            const body = event.body ? JSON.parse(event.body) : {};
            const userId = body.userId || (event.queryStringParameters && event.queryStringParameters.userId) || "";
            const result = await deleteLoginUser(userId);
            return json(200, { ok: true, ...result });
        }

        return json(405, { ok: false, error: "Method not allowed" });
    } catch (err) {
        return json(500, { ok: false, error: err.message || "Admin users failed" });
    }
};
