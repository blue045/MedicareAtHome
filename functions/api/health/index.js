import { getAboutDb, getAboutDbStatus } from "../../_lib/about-db.js";
import { getDb, getDbStatus } from "../../_lib/db.js";
import { json } from "../../_lib/response.js";
import { getStoreDb, getStoreDbStatus } from "../../_lib/store-db.js";

async function probe(name, status, getDbFn) {
  try {
    const db = await getDbFn();
    const result = await db.execute("SELECT 1 AS ok");
    return { name, ok: true, database: "connected", env: status, test: result.rows?.[0] || { ok: 1 } };
  } catch (error) {
    return { name, ok: false, database: "not_connected", env: status, error: error?.message || "Unknown database error" };
  }
}

export async function onRequestGet({ env }) {
  const checks = await Promise.all([
    probe("main", getDbStatus(env), () => getDb(env)),
    probe("store", getStoreDbStatus(env), () => getStoreDb(env)),
    probe("about", getAboutDbStatus(env), () => getAboutDb(env))
  ]);
  const ok = checks.every((check) => check.ok);
  return json({ ok, checks }, { status: ok ? 200 : 500 });
}
