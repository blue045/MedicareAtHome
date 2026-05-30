import { error, handleThrown, json } from "../../../_lib/response.js";
import { getStoreDb, getStoreUserFromRequest } from "../../../_lib/store-db.js";

export async function onRequestGet({ request, env }) {
  try {
    const db = await getStoreDb(env, { mode: "auth" });
    const user = await getStoreUserFromRequest(request, env, db);
    if (!user) return error("Not logged in", 401);
    return json({ user });
  } catch (err) {
    return handleThrown(err);
  }
}
