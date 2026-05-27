import { requireAdmin } from "../../../../_lib/auth.js";
import { handleThrown, json } from "../../../../_lib/response.js";
import { getStoreDb, listUsers } from "../../../../_lib/store-db.js";

export async function onRequestGet({ request, env }) {
  try {
    const unauthorized = await requireAdmin(request, env, "store-users");
    if (unauthorized) return unauthorized;
    const db = await getStoreDb(env);
    const users = await listUsers(db);
    return json({ users });
  } catch (err) {
    return handleThrown(err);
  }
}
