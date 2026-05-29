import { getDb } from "../../_lib/db.js";
import { isAdmin, requireAdmin } from "../../_lib/auth.js";
import { error, handleThrown, json, readJson } from "../../_lib/response.js";
import { createAmbulance, listAmbulances } from "../../_lib/turso.js";
import { normalizeAmbulance, toPublicAmbulance } from "../../_lib/validators.js";

export async function onRequestGet({ request, env }) {
  try {
    const db = await getDb(env);
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get("includeInactive") === "true" && await isAdmin(request, env, "ambulance");
    const ambulances = await listAmbulances(db, includeInactive);
    return json({ ambulances: ambulances.map(toPublicAmbulance) }, { headers: includeInactive ? {} : { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const unauthorized = await requireAdmin(request, env, "ambulance");
    if (unauthorized) return unauthorized;
    const body = await readJson(request, env);
    const result = normalizeAmbulance(body);
    if (!result.ok) return error(result.error, 400);
    const db = await getDb(env);
    const ambulance = await createAmbulance(db, result.value);
    return json({ ok: true, ambulance: toPublicAmbulance(ambulance) }, { status: 201 });
  } catch (err) {
    return handleThrown(err);
  }
}
