import { getAdminSession } from "../../_lib/auth.js";
import { ADMIN_MODULES } from "../../_lib/admin-users.js";
import { handleThrown, json } from "../../_lib/response.js";

export async function onRequestGet({ request, env }) {
  try {
    const session = await getAdminSession(request, env);
    if (!session) return json({ ok: false, loggedIn: false }, { status: 401 });
    return json({ ok: true, loggedIn: true, session, modules: ADMIN_MODULES });
  } catch (err) {
    return handleThrown(err);
  }
}
