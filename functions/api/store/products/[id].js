import { isAdmin, requireAdmin } from "../../../_lib/auth.js";
import { error, handleThrown, json, readJson } from "../../../_lib/response.js";
import { deleteProduct, getProductById, getStoreDb, sanitizeProductInput, updateProduct } from "../../../_lib/store-db.js";

function productId(context) {
  return context.params?.id || context.params?.product || "";
}

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const admin = await isAdmin(request, env, "products");
    const db = await getStoreDb(env);
    const product = await getProductById(db, productId(context), admin);
    if (!product) return error("Product not found", 404);
    return json({ product }, { headers: admin ? {} : { "cache-control": "public, max-age=20, stale-while-revalidate=60" } });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestPatch(context) {
  try {
    const { request, env } = context;
    const unauthorized = await requireAdmin(request, env, "products");
    if (unauthorized) return unauthorized;
    const db = await getStoreDb(env);
    const current = await getProductById(db, productId(context), true);
    if (!current) return error("Product not found", 404);
    const body = await readJson(request);
    const result = sanitizeProductInput(body, current);
    if (!result.ok) return error(result.error, 400);
    const product = await updateProduct(db, current.id, result.value);
    return json({ ok: true, product });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestDelete(context) {
  try {
    const { request, env } = context;
    const unauthorized = await requireAdmin(request, env, "products");
    if (unauthorized) return unauthorized;
    const db = await getStoreDb(env);
    const deleted = await deleteProduct(db, productId(context));
    if (!deleted) return error("Product not found", 404);
    return json({ ok: true });
  } catch (err) {
    return handleThrown(err);
  }
}
