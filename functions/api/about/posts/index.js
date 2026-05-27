import { requireAdmin } from "../../../_lib/auth.js";
import { createAboutPost, getAboutDb, listAbout } from "../../../_lib/about-db.js";
import { error, handleThrown, json, readJson } from "../../../_lib/response.js";

export async function onRequestGet({ request, env }) {
  try {
    const unauthorized = await requireAdmin(request, env, "content");
    if (unauthorized) return unauthorized;
    const db = await getAboutDb(env);
    const data = await listAbout(db, true);
    return json({ ok: true, posts: data.posts });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const unauthorized = await requireAdmin(request, env, "content");
    if (unauthorized) return unauthorized;
    const body = await readJson(request);
    const db = await getAboutDb(env);
    const post = await createAboutPost(db, body || {});
    return json({ ok: true, post }, { status: 201 });
  } catch (err) {
    return error(err?.message || "Could not save blog post.", 400);
  }
}
