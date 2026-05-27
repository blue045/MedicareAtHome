import { requireAdmin } from "../../../../_lib/auth.js";
import { handleThrown, json } from "../../../../_lib/response.js";
import { getStoreDb, listComments } from "../../../../_lib/store-db.js";

export async function onRequestGet({ request, env }) {
  try {
    const unauthorized = await requireAdmin(request, env, "comments");
    if (unauthorized) return unauthorized;
    const db = await getStoreDb(env);
    const comments = await listComments(db, null, true);
    return json({ comments });
  } catch (err) {
    return handleThrown(err);
  }
}
