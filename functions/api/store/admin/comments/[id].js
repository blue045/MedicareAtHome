import { requireAdmin } from "../../../../_lib/auth.js";
import { error, handleThrown, json, readJson } from "../../../../_lib/response.js";
import { createAdminCommentReply, deleteComment, getStoreDb, setCommentVisibility } from "../../../../_lib/store-db.js";

export async function onRequestPatch({ request, env, params }) {
  try {
    const unauthorized = await requireAdmin(request, env, "comments");
    if (unauthorized) return unauthorized;
    const body = await readJson(request);
    const db = await getStoreDb(env);
    const text = body.replyText || body.adminReply || "";
    const comment = text
      ? await createAdminCommentReply(db, params.id, text, body.isVisible !== false)
      : await setCommentVisibility(db, params.id, body.isVisible !== false);
    if (!comment) return error("Review not found", 404);
    return json({ ok: true, comment });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    const unauthorized = await requireAdmin(request, env, "comments");
    if (unauthorized) return unauthorized;
    const db = await getStoreDb(env);
    const deleted = await deleteComment(db, params.id);
    if (!deleted) return error("Review not found", 404);
    return json({ ok: true });
  } catch (err) {
    return handleThrown(err);
  }
}
