import { handleLogin } from "../../_lib/auth.js";
import { getDb } from "../../_lib/db.js";
import { error, handleThrown } from "../../_lib/response.js";
import { rateLimitRequest } from "../../_lib/security.js";

export async function onRequestPost({ request, env }) {
  try {
    const db = await getDb(env);
    const limit = await rateLimitRequest(db, request, env, "admin_login", { limit: 6, windowSeconds: 15 * 60 });
    if (!limit.ok) return error("Too many admin login attempts. Please wait and try again.", 429, undefined, { "retry-after": String(limit.retryAfter || 60) });
    return await handleLogin(request, env);
  } catch (err) {
    return handleThrown(err);
  }
}
