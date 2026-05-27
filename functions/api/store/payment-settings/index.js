import { requireAdmin } from "../../../_lib/auth.js";
import { error, handleThrown, json, readJson } from "../../../_lib/response.js";
import { getPaymentSettings, getStoreDb, updatePaymentSettings } from "../../../_lib/store-db.js";

export async function onRequestGet({ env }) {
  try {
    const db = await getStoreDb(env);
    const paymentSettings = await getPaymentSettings(db);
    return json({ paymentSettings }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestPatch({ request, env }) {
  try {
    const unauthorized = await requireAdmin(request, env, "orders");
    if (unauthorized) return unauthorized;
    const db = await getStoreDb(env);
    const body = await readJson(request);
    const paymentSettings = await updatePaymentSettings(db, body || {});
    return json({ ok: true, paymentSettings });
  } catch (err) {
    return error(err?.message || "Could not save manual payment settings.", 400);
  }
}
