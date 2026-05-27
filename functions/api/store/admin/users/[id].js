import { requireAdmin } from "../../../../_lib/auth.js";
import { error, handleThrown, json } from "../../../../_lib/response.js";
import { deleteUser, getStoreDb } from "../../../../_lib/store-db.js";

export async function onRequestDelete({ request, env, params }) {
  try {
    const unauthorized = await requireAdmin(request, env, "store-users");
    if (unauthorized) return unauthorized;
    const db = await getStoreDb(env);
    const deleted = await deleteUser(db, params.id);
    if (!deleted) return error("User not found", 404);
    return json({ ok: true });
  } catch (err) {
    return handleThrown(err);
  }
}
