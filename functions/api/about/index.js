import { isAdmin } from "../../_lib/auth.js";
import { getAboutDb, getAboutDbStatus, listAbout } from "../../_lib/about-db.js";
import { handleThrown, json } from "../../_lib/response.js";

export async function onRequestGet({ request, env }) {
  try {
    const admin = await isAdmin(request, env, "content");
    const status = getAboutDbStatus(env);
    if (!status.hasDatabaseUrl || !status.hasAuthToken) {
      return json({ profiles: [], posts: [], dbConfigured: false, message: "About Turso database is not configured yet." });
    }
    const db = await getAboutDb(env);
    const data = await listAbout(db, admin && new URL(request.url).searchParams.get("includeDrafts") === "true");
    return json({ ...data, dbConfigured: true }, { headers: admin ? {} : { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (err) {
    return handleThrown(err);
  }
}
