import { getDb } from "../../../_lib/db.js";
import { requireAdmin } from "../../../_lib/auth.js";
import { error, handleThrown, json, readJson } from "../../../_lib/response.js";
import { deleteHospital, getHospitalById, updateHospital } from "../../../_lib/turso.js";
import { normalizeHospital, toPublicHospital } from "../../../_lib/validators.js";

export async function onRequestGet({ params, env }) {
  try {
    const db = await getDb(env);
    const hospital = await getHospitalById(db, params.id);
    if (!hospital || hospital.isActive === false) return error("Hospital not found.", 404);
    return json({ hospital: toPublicHospital(hospital) }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestPatch({ request, params, env }) {
  try {
    const unauthorized = await requireAdmin(request, env, "hospitals");
    if (unauthorized) return unauthorized;
    const db = await getDb(env);
    const existing = await getHospitalById(db, params.id);
    if (!existing) return error("Hospital not found.", 404);
    const body = await readJson(request, env);
    const result = normalizeHospital(body, existing);
    if (!result.ok) return error(result.error, 400);
    const hospital = await updateHospital(db, params.id, result.value);
    return json({ ok: true, hospital: toPublicHospital(hospital) });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestDelete({ request, params, env }) {
  try {
    const unauthorized = await requireAdmin(request, env, "hospitals");
    if (unauthorized) return unauthorized;
    const db = await getDb(env);
    const deleted = await deleteHospital(db, params.id);
    if (!deleted) return error("Hospital not found.", 404);
    return json({ ok: true });
  } catch (err) {
    return handleThrown(err);
  }
}
