import { error, handleThrown, json } from "../../../_lib/response.js";
import { getStoreDb, getStoreUserFromRequest, removeCartItem } from "../../../_lib/store-db.js";

export async function onRequestDelete({ request, env, params }) {
  try {
    const db = await getStoreDb(env);
    const user = await getStoreUserFromRequest(request, env, db);
    if (!user) return error("Please log in first.", 401);
    const deleted = await removeCartItem(db, user.id, params.id);
    if (!deleted) return error("Cart item not found.", 404);
    return json({ ok: true });
  } catch (err) {
    return handleThrown(err);
  }
}
