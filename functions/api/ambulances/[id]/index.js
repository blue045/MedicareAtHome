import { getDb } from "../../../_lib/db.js";
import { requireAdmin } from "../../../_lib/auth.js";
import { error, handleThrown, json, readJson } from "../../../_lib/response.js";
import { deleteAmbulance, getAmbulanceById, updateAmbulance } from "../../../_lib/turso.js";
import { normalizeAmbulance, toPublicAmbulance } from "../../../_lib/validators.js";

export async function onRequestGet({ params, env }) {
  try {
    const db = await getDb(env);
    const ambulance = await getAmbulanceById(db, params.id);
    if (!ambulance || ambulance.isActive === false) return error("Ambulance not found.", 404);
    return json({ ambulance: toPublicAmbulance(ambulance) }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestPatch({ request, params, env }) {
  try {
    const unauthorized = await requireAdmin(request, env, "ambulance");
    if (unauthorized) return unauthorized;
    const db = await getDb(env);
    const existing = await getAmbulanceById(db, params.id);
    if (!existing) return error("Ambulance not found.", 404);
    const body = await readJson(request, env);
    const result = normalizeAmbulance(body, existing);
    if (!result.ok) return error(result.error, 400);
    const ambulance = await updateAmbulance(db, params.id, result.value);
    return json({ ok: true, ambulance: toPublicAmbulance(ambulance) });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestDelete({ request, params, env }) {
  try {
    const unauthorized = await requireAdmin(request, env, "ambulance");
    if (unauthorized) return unauthorized;
    const db = await getDb(env);
    const deleted = await deleteAmbulance(db, params.id);
    if (!deleted) return error("Ambulance not found.", 404);
    return json({ ok: true });
  } catch (err) {
    return handleThrown(err);
  }
}
