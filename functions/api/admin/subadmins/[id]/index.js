import { requireAdmin } from "../../../../_lib/auth.js";
import { deleteSubAdmin, updateSubAdmin } from "../../../../_lib/admin-users.js";
import { error, handleThrown, json, readJson } from "../../../../_lib/response.js";

const subAdminId = (context) => context.params?.id || "";

export async function onRequestPatch({ request, env, params }) {
  try {
    const unauthorized = await requireAdmin(request, env, "master");
    if (unauthorized) return unauthorized;
    const body = await readJson(request);
    const admin = await updateSubAdmin(env, params?.id || subAdminId({ params }), body || {});
    return json({ ok: true, admin });
  } catch (err) {
    return error(err?.message || "Could not update sub-admin.", 400);
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    const unauthorized = await requireAdmin(request, env, "master");
    if (unauthorized) return unauthorized;
    const deleted = await deleteSubAdmin(env, params?.id || subAdminId({ params }));
    return json({ ok: true, deleted });
  } catch (err) {
    return handleThrown(err);
  }
}
