import { requireAdmin } from "../../../../_lib/auth.js";
import { error, handleThrown, json, readJson } from "../../../../_lib/response.js";
import { createAvatar, getStoreDb, listAvatars, sanitizeAvatarInput } from "../../../../_lib/store-db.js";

export async function onRequestGet({ request, env }) {
  try {
    const unauthorized = await requireAdmin(request, env, "store-users");
    if (unauthorized) return unauthorized;
    const db = await getStoreDb(env);
    const avatars = await listAvatars(db, true);
    return json({ avatars });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const unauthorized = await requireAdmin(request, env, "store-users");
    if (unauthorized) return unauthorized;
    const body = await readJson(request);
    const result = sanitizeAvatarInput(body);
    if (!result.ok) return error(result.error, 400);
    const db = await getStoreDb(env);
    const avatar = await createAvatar(db, result.value);
    return json({ ok: true, avatar }, { status: 201 });
  } catch (err) {
    return handleThrown(err);
  }
}
