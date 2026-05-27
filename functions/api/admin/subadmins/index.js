import { requireAdmin } from "../../../_lib/auth.js";
import { ADMIN_MODULES, createSubAdmin, listSubAdmins } from "../../../_lib/admin-users.js";
import { error, handleThrown, json, readJson } from "../../../_lib/response.js";

export async function onRequestGet({ request, env }) {
  try {
    const unauthorized = await requireAdmin(request, env, "master");
    if (unauthorized) return unauthorized;
    const admins = await listSubAdmins(env);
    return json({ ok: true, admins, modules: ADMIN_MODULES });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const unauthorized = await requireAdmin(request, env, "master");
    if (unauthorized) return unauthorized;
    const body = await readJson(request);
    const admin = await createSubAdmin(env, body || {});
    return json({ ok: true, admin }, { status: 201 });
  } catch (err) {
    return error(err?.message || "Could not create sub-admin.", 400);
  }
}
