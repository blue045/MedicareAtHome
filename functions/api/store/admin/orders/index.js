import { requireAdmin } from "../../../../_lib/auth.js";
import { handleThrown, json } from "../../../../_lib/response.js";
import { getStoreDb, listOrders } from "../../../../_lib/store-db.js";

export async function onRequestGet({ request, env }) {
  try {
    const unauthorized = await requireAdmin(request, env, "orders");
    if (unauthorized) return unauthorized;
    const db = await getStoreDb(env);
    const orders = await listOrders(db, null);
    return json({ orders });
  } catch (err) {
    return handleThrown(err);
  }
}
