import { requireAdmin } from "../../../../_lib/auth.js";
import { error, handleThrown, json, readJson } from "../../../../_lib/response.js";
import { deleteAvatar, getAvatarById, getStoreDb, sanitizeAvatarInput, updateAvatar } from "../../../../_lib/store-db.js";

export async function onRequestPatch({ request, env, params }) {
  try {
    const unauthorized = await requireAdmin(request, env, "store-users");
    if (unauthorized) return unauthorized;
    const body = await readJson(request);
    const db = await getStoreDb(env);
    const existing = await getAvatarById(db, params.id);
    if (!existing) return error("Profile photo not found", 404);
    const result = sanitizeAvatarInput(body, existing);
    if (!result.ok) return error(result.error, 400);
    const avatar = await updateAvatar(db, params.id, result.value);
    return json({ ok: true, avatar });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    const unauthorized = await requireAdmin(request, env, "store-users");
    if (unauthorized) return unauthorized;
    const db = await getStoreDb(env);
    const deleted = await deleteAvatar(db, params.id);
    if (!deleted) return error("Profile photo not found", 404);
    return json({ ok: true });
  } catch (err) {
    return handleThrown(err);
  }
}
