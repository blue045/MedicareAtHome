import { requireAdmin } from "../../../../../_lib/auth.js";
import { error, handleThrown, json, readJson } from "../../../../../_lib/response.js";
import { getStoreDb, updateUserPassword } from "../../../../../_lib/store-db.js";

export async function onRequestPost({ request, env, params }) {
  try {
    const unauthorized = await requireAdmin(request, env, "store-users");
    if (unauthorized) return unauthorized;
    const body = await readJson(request);
    const db = await getStoreDb(env);
    const result = await updateUserPassword(db, params.id, body.password, env);
    if (!result.ok) return error(result.error || "Could not update password", result.status || 400);
    return json({ ok: true, user: result.user });
  } catch (err) {
    return handleThrown(err);
  }
}
