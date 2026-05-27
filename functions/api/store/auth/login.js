import { error, handleThrown, json, readJson } from "../../../_lib/response.js";
import { createStoreToken, getStoreDb, verifyLogin } from "../../../_lib/store-db.js";
import { notifyTelegram } from "../../../_lib/telegram.js";

export async function onRequestPost({ request, env }) {
  try {
    const body = await readJson(request);
    const identifier = String(body.identifier || body.email || body.phone || "").trim();
    const password = String(body.password || "");
    if (!identifier || !password) return error("Email/phone and password are required.", 400);

    const db = await getStoreDb(env);
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
    return handleThrown(err);
  }
}
