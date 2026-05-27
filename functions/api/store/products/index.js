import { isAdmin, requireAdmin } from "../../../_lib/auth.js";
import { error, handleThrown, json, readJson } from "../../../_lib/response.js";
import { createProduct, getStoreDb, listProducts, sanitizeProductInput } from "../../../_lib/store-db.js";

export async function onRequestGet({ request, env }) {
  try {
    const admin = await isAdmin(request, env, "products");
    const includeInactive = admin && new URL(request.url).searchParams.get("includeInactive") === "true";
    const db = await getStoreDb(env);
    const products = await listProducts(db, includeInactive);
    return json({ products }, { headers: includeInactive ? {} : { "cache-control": "public, max-age=30, stale-while-revalidate=60" } });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const unauthorized = await requireAdmin(request, env, "products");
    if (unauthorized) return unauthorized;
    const body = await readJson(request);
    const result = sanitizeProductInput(body);
    if (!result.ok) return error(result.error, 400);
    const db = await getStoreDb(env);
    const product = await createProduct(db, result.value);
    return json({ ok: true, product }, { status: 201 });
  } catch (err) {
    return handleThrown(err);
  }
}
