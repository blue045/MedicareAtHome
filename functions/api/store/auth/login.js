import { error, handleThrown, json, readJson } from "../../../_lib/response.js";
import { rateLimitRequest } from "../../../_lib/security.js";
import { createStoreToken, getStoreDb, verifyLogin } from "../../../_lib/store-db.js";
import { notifyTelegram } from "../../../_lib/telegram.js";

function rateLimitError(result) {
  return error("Too many login attempts. Please wait and try again.", 429, undefined, { "retry-after": String(result.retryAfter || 60) });
}

export async function onRequestPost({ request, env }) {
  try {
    const db = await getStoreDb(env);
    const limit = await rateLimitRequest(db, request, env, "store_login", { limit: 8, windowSeconds: 15 * 60 });
    if (!limit.ok) return rateLimitError(limit);

    const body = await readJson(request, env);
    const identifier = String(body.identifier || body.email || body.phone || "").trim();
    const password = String(body.password || "");
    if (!identifier || !password) return error("Email/phone and password are required.", 400);

    const user = await verifyLogin(db, identifier, password, env);
    if (!user) return error("Invalid email/phone or password.", 401);

    await notifyTelegram(env, "New user login", {
      Name: user.fullName,
      Email: user.email || "Not provided",
      Phone: user.phone || "Not provided",
      UserID: user.id
    });
    const token = await createStoreToken(user, env);
    return json({ ok: true, token, user });
  } catch (err) {
    if (String(err?.message || "").toLowerCase().includes("verify your email")) {
      return error(err.message, 403);
    }
    return handleThrown(err);
  }
}
