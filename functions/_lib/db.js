import { createClient } from "@libsql/client/web";
import { ensureSeed } from "./seed.js";

const clients = new Map();
const initialized = new Set();

function cleanEnv(value) {
  return String(value || "").trim().replace(/^['\"]|['\"]$/g, "");
}

export function getTursoConfig(env) {
  const url = cleanEnv(env.TURSO_DATABASE_URL || env.TURSO_URL || env.LIBSQL_URL);
  const authToken = cleanEnv(env.TURSO_AUTH_TOKEN || env.LIBSQL_AUTH_TOKEN);

  if (!url) {
    throw new Error("Missing Turso database URL. Add TURSO_DATABASE_URL or TURSO_URL in Cloudflare Pages environment variables.");
  }

  if (!authToken) {
    throw new Error("Missing Turso auth token. Add TURSO_AUTH_TOKEN in Cloudflare Pages environment variables.");
  }

  if (!url.startsWith("libsql://") && !url.startsWith("https://") && !url.startsWith("http://")) {
    throw new Error("Invalid Turso database URL. It should look like libsql://your-db-your-org.turso.io");
  }

  return { url, authToken };
}

export function getDbStatus(env) {
  const url = cleanEnv(env.TURSO_DATABASE_URL || env.TURSO_URL || env.LIBSQL_URL);
  const authToken = cleanEnv(env.TURSO_AUTH_TOKEN || env.LIBSQL_AUTH_TOKEN);

  return {
    hasDatabaseUrl: Boolean(url),
    hasAuthToken: Boolean(authToken),
    acceptedUrlNames: ["TURSO_DATABASE_URL", "TURSO_URL", "LIBSQL_URL"],
    acceptedTokenNames: ["TURSO_AUTH_TOKEN", "LIBSQL_AUTH_TOKEN"],
    urlLooksValid: Boolean(url && (url.startsWith("libsql://") || url.startsWith("https://") || url.startsWith("http://")))
  };
}

export async function getDb(env) {
  const { url, authToken } = getTursoConfig(env);
  const cacheKey = `${url}::${authToken.slice(0, 12)}`;

  let client = clients.get(cacheKey);
  if (!client) {
    client = createClient({ url, authToken });
    clients.set(cacheKey, client);
  }

  if (!initialized.has(cacheKey)) {
    await ensureSeed(client, env);
    initialized.add(cacheKey);
  }

  return client;
}
