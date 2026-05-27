import { getDb } from "../../_lib/db.js";
import { isAdmin, requireAdmin } from "../../_lib/auth.js";
import { error, handleThrown, json, readJson } from "../../_lib/response.js";
import { normalizeBloodProfile, toPublicBloodProfile } from "../../_lib/validators.js";
import { deleteBloodProfile, getBloodProfileById, setBloodProfileApproval, updateBloodProfile } from "../../_lib/turso.js";

function parseId(id) {
  const match = String(id || "").match(/^\d+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isInteger(parsed) && parsed > 0 ? String(parsed) : null;
}

export async function onRequestGet({ request, env, params }) {
  try {
    const id = parseId(params.id);
    if (!id) return error("Invalid blood profile ID", 400);

    const admin = await isAdmin(request, env, "blood");
    const db = await getDb(env);
    const profile = await getBloodProfileById(db, id);
    if (!profile || (!profile.isApproved && !admin)) return error("Blood profile not found", 404);

    return json({ profile: toPublicBloodProfile(profile, { admin }) });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestPatch({ request, env, params }) {
  try {
    const unauthorized = await requireAdmin(request, env, "blood");
    if (unauthorized) return unauthorized;

    const id = parseId(params.id);
    if (!id) return error("Invalid blood profile ID", 400);

    const db = await getDb(env);
    const current = await getBloodProfileById(db, id);
    if (!current) return error("Blood profile not found", 404);

    const body = await readJson(request);
    if (Object.prototype.hasOwnProperty.call(body, "isApproved") && Object.keys(body).length <= 1) {
      const profile = await setBloodProfileApproval(db, id, body.isApproved === true);
      return json({ ok: true, profile: toPublicBloodProfile(profile, { admin: true }) });
    }

    const result = normalizeBloodProfile(body, current);
    if (!result.ok) return error(result.error, 400);
    const profile = await updateBloodProfile(db, id, result.value);
    return json({ ok: true, profile: toPublicBloodProfile(profile, { admin: true }) });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    const unauthorized = await requireAdmin(request, env, "blood");
    if (unauthorized) return unauthorized;

    const id = parseId(params.id);
    if (!id) return error("Invalid blood profile ID", 400);

    const db = await getDb(env);
    const deletedCount = await deleteBloodProfile(db, id);
    if (!deletedCount) return error("Blood profile not found", 404);

    return json({ ok: true });
  } catch (err) {
    return handleThrown(err);
  }
}
