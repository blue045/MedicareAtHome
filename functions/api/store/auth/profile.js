import { error, handleThrown, json, readJson } from "../../../_lib/response.js";
import { getStoreDb, getStoreUserFromRequest, updateUserProfile } from "../../../_lib/store-db.js";

export async function onRequestPatch({ request, env }) {
  try {
    const db = await getStoreDb(env, { mode: "auth" });
    const user = await getStoreUserFromRequest(request, env, db);
    if (!user) return error("Not logged in", 401);

    const body = await readJson(request);
    const result = await updateUserProfile(db, user.id, body);
    if (!result.ok) return error(result.error || "Could not update profile", result.status || 400);
    return json({ ok: true, user: result.user });
  } catch (err) {
    return handleThrown(err);
  }
}
