import { requireAdmin } from "../../../../_lib/auth.js";
import { deleteAboutPost, getAboutDb, updateAboutPost } from "../../../../_lib/about-db.js";
import { error, handleThrown, json, readJson } from "../../../../_lib/response.js";

export async function onRequestPatch({ request, env, params }) {
  try {
    const unauthorized = await requireAdmin(request, env, "content");
    if (unauthorized) return unauthorized;
    const body = await readJson(request);
    const db = await getAboutDb(env);
    const post = await updateAboutPost(db, params.id, body || {});
    return json({ ok: true, post });
  } catch (err) {
    return error(err?.message || "Could not update blog post.", 400);
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    const unauthorized = await requireAdmin(request, env, "content");
    if (unauthorized) return unauthorized;
    const db = await getAboutDb(env);
    const deleted = await deleteAboutPost(db, params.id);
    return json({ ok: true, deleted });
  } catch (err) {
    return handleThrown(err);
  }
}
