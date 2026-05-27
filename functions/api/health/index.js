import { getDb, getDbStatus } from "../../_lib/db.js";
import { json } from "../../_lib/response.js";

export async function onRequestGet({ env }) {
  const envStatus = getDbStatus(env);

  try {
    const db = await getDb(env);
    const result = await db.execute("SELECT 1 AS ok");

    return json({
      ok: true,
      database: "connected",
      env: envStatus,
      test: result.rows?.[0] || { ok: 1 }
    });
  } catch (error) {
    return json(
      {
        ok: false,
        database: "not_connected",
        env: envStatus,
        error: error?.message || "Unknown database error"
      },
      { status: 500 }
    );
  }
}
