import { getDb } from "../../_lib/db.js";
import { isAdmin, requireAdmin } from "../../_lib/auth.js";
import { error, handleThrown, json, readJson } from "../../_lib/response.js";
import { normalizeDoctor, toPublicDoctor } from "../../_lib/validators.js";
import { createDoctor, listDoctors } from "../../_lib/turso.js";

export async function onRequestGet({ env, request }) {
  try {
    const db = await getDb(env);
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get("includeInactive") === "true" && await isAdmin(request, env, "doctors");
    const doctors = await listDoctors(db, includeInactive);

    return json({ doctors: doctors.map(toPublicDoctor) }, { headers: includeInactive ? {} : { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const unauthorized = await requireAdmin(request, env, "doctors");
    if (unauthorized) return unauthorized;

    const body = await readJson(request);
    const result = normalizeDoctor(body);
    if (!result.ok) return error(result.error, 400);

    const db = await getDb(env);
    const doctor = await createDoctor(db, result.value);
    return json({ ok: true, doctor: toPublicDoctor(doctor) }, { status: 201 });
  } catch (err) {
    return handleThrown(err);
  }
}
