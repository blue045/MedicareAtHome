import { getDb } from "../../_lib/db.js";
import { isAdmin, requireAdmin } from "../../_lib/auth.js";
import { error, handleThrown, json, readJson } from "../../_lib/response.js";
import { createHospital, listHospitals } from "../../_lib/turso.js";
import { normalizeHospital, toPublicHospital } from "../../_lib/validators.js";

export async function onRequestGet({ request, env }) {
  try {
    const db = await getDb(env);
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get("includeInactive") === "true" && await isAdmin(request, env, "hospitals");
    const hospitals = await listHospitals(db, includeInactive);
    return json({ hospitals: hospitals.map(toPublicHospital) }, { headers: includeInactive ? {} : { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const unauthorized = await requireAdmin(request, env, "hospitals");
    if (unauthorized) return unauthorized;
    const body = await readJson(request, env);
    const result = normalizeHospital(body);
    if (!result.ok) return error(result.error, 400);
    const db = await getDb(env);
    const hospital = await createHospital(db, result.value);
    return json({ ok: true, hospital: toPublicHospital(hospital) }, { status: 201 });
  } catch (err) {
    return handleThrown(err);
  }
}
