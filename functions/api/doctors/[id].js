import { getDb } from "../../_lib/db.js";
import { isAdmin, requireAdmin } from "../../_lib/auth.js";
import { error, handleThrown, json, readJson } from "../../_lib/response.js";
import { normalizeDoctor, toPublicDoctor } from "../../_lib/validators.js";
import { deleteDoctor, getDoctorById, updateDoctor } from "../../_lib/turso.js";

function parseId(id) {
  const match = String(id || "").match(/^\d+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isInteger(parsed) && parsed > 0 ? String(parsed) : null;
}

export async function onRequestGet({ request, env, params }) {
  try {
    const id = parseId(params.id);
    if (!id) return error("Invalid doctor ID", 400);

    const db = await getDb(env);
    const doctor = await getDoctorById(db, id);
    if (!doctor || (doctor.isActive === false && !(await isAdmin(request, env, "doctors")))) {
      return error("Doctor not found", 404);
    }

    return json({ doctor: toPublicDoctor(doctor) });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestPatch({ request, env, params }) {
  try {
    const unauthorized = await requireAdmin(request, env, "doctors");
    if (unauthorized) return unauthorized;

    const id = parseId(params.id);
    if (!id) return error("Invalid doctor ID", 400);

    const db = await getDb(env);
    const current = await getDoctorById(db, id);
    if (!current) return error("Doctor not found", 404);

    const body = await readJson(request);
    const result = normalizeDoctor(body, current);
    if (!result.ok) return error(result.error, 400);

    const doctor = await updateDoctor(db, id, result.value);
    return json({ ok: true, doctor: toPublicDoctor(doctor) });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    const unauthorized = await requireAdmin(request, env, "doctors");
    if (unauthorized) return unauthorized;

    const id = parseId(params.id);
    if (!id) return error("Invalid doctor ID", 400);

    const db = await getDb(env);
    const deletedCount = await deleteDoctor(db, id);
    if (!deletedCount) return error("Doctor not found", 404);

    return json({ ok: true });
  } catch (err) {
    return handleThrown(err);
  }
}
