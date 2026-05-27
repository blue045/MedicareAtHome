import { error, handleThrown, json, readJson } from "../../../_lib/response.js";
import { addToCart, getStoreDb, getStoreUserFromRequest, listCart } from "../../../_lib/store-db.js";

async function requireUser(request, env, db) {
  const user = await getStoreUserFromRequest(request, env, db);
  return user;
}

export async function onRequestGet({ request, env }) {
  try {
    const db = await getStoreDb(env);
    const user = await requireUser(request, env, db);
    if (!user) return error("Please log in first.", 401);
    const cart = await listCart(db, user.id);
    return json({ cart });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const db = await getStoreDb(env);
    const user = await requireUser(request, env, db);
    if (!user) return error("Please log in first.", 401);
    const body = await readJson(request);
    const productId = String(body.productId || "").trim();
    const quantity = Math.max(1, Math.min(50, Math.round(Number(body.quantity || 1))));
    if (!productId) return error("Product is required.", 400);
    const cart = await addToCart(db, user.id, productId, quantity);
    return json({ ok: true, cart });
  } catch (err) {
    return error(err?.message || "Could not add to cart.", 400);
  }
}
