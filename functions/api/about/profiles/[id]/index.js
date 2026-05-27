import { requireAdmin } from "../../../../_lib/auth.js";
import { deleteAboutProfile, getAboutDb, updateAboutProfile } from "../../../../_lib/about-db.js";
import { error, handleThrown, json, readJson } from "../../../../_lib/response.js";

export async function onRequestPatch({ request, env, params }) {
  try {
    const unauthorized = await requireAdmin(request, env, "content");
    if (unauthorized) return unauthorized;
    const body = await readJson(request);
    const db = await getAboutDb(env);
    const profile = await updateAboutProfile(db, params.id, body || {});
    return json({ ok: true, profile });
  } catch (err) {
    return error(err?.message || "Could not update profile.", 400);
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    const unauthorized = await requireAdmin(request, env, "content");
    if (unauthorized) return unauthorized;
    const db = await getAboutDb(env);
    const deleted = await deleteAboutProfile(db, params.id);
    return json({ ok: true, deleted });
  } catch (err) {
    return handleThrown(err);
  }
}
