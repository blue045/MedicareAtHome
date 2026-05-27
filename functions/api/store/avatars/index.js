import { handleThrown, json } from "../../../_lib/response.js";
import { getStoreDb, listAvatars } from "../../../_lib/store-db.js";

export async function onRequestGet({ env }) {
  try {
    const db = await getStoreDb(env);
    const avatars = await listAvatars(db, false);
    return json({ avatars }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=120" } });
  } catch (err) {
    return handleThrown(err);
  }
}
