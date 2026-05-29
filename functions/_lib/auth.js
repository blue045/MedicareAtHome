import { error, json, readJson } from "./response.js";
import { ADMIN_MODULES, normalizePermissions, verifySubAdminLogin } from "./admin-users.js";
import { constantTimeEqual, hmacHex, requiredSecret } from "./security.js";

function configuredToken(env) {
  return String(env.ADMIN_TOKEN || env.ADMIN_PASSWORD || "").trim();
}

function base64UrlEncode(text) {
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(text) {
  const normalized = String(text || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

async function hmacSign(text, secret) {
  return hmacHex(text, secret);
}

function sessionSecret(env = {}) {
  return requiredSecret(env, ["ADMIN_SESSION_SECRET", "ADMIN_PASSWORD", "ADMIN_TOKEN"], "ADMIN_SESSION_SECRET or ADMIN_PASSWORD", 12);
}

async function createSignedSession(payload, env) {
  const safePayload = {
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7
  };
  const encoded = base64UrlEncode(JSON.stringify(safePayload));
  const sig = await hmacSign(encoded, sessionSecret(env));
  return `${encoded}.${sig}`;
}

async function readSignedSession(token, env) {
  const [encoded, sig] = String(token || "").split(".");
  if (!encoded || !sig) return null;
  const expected = await hmacSign(encoded, sessionSecret(env));
  if (!constantTimeEqual(expected, sig)) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(encoded));
    if (!payload || (payload.exp && Number(payload.exp) < Date.now())) return null;
    return payload;
  } catch {
    return null;
  }
}

function allPermissions() {
  return ADMIN_MODULES.map((item) => item.key);
}

export async function getAdminSession(request, env) {
  const expected = configuredToken(env);
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  // Backward compatibility for old saved master tokens.
  if (expected && token === expected) {
    return { ok: true, role: "master", isMaster: true, username: "master", permissions: allPermissions() };
  }

  const session = await readSignedSession(token, env);
  if (!session) return null;
  const role = session.role === "master" ? "master" : "subadmin";
  return {
    ok: true,
    role,
    isMaster: role === "master",
    username: String(session.username || (role === "master" ? "master" : "subadmin")),
    displayName: String(session.displayName || session.username || "Admin"),
    permissions: role === "master" ? allPermissions() : normalizePermissions(session.permissions || [])
  };
}

export async function isAdmin(request, env, permission = "") {
  const session = await getAdminSession(request, env);
  if (!session) return false;
  if (!permission || session.isMaster) return true;
  return session.permissions.includes(permission);
}

export async function requireAdmin(request, env, permission = "") {
  const session = await getAdminSession(request, env);
  if (!session) return error("Unauthorized", 401);
  if (permission && !session.isMaster && !session.permissions.includes(permission)) {
    return error("You do not have permission to access this section.", 403);
  }
  return null;
}

export async function handleLogin(request, env) {
  const body = await readJson(request);
  const mode = String(body.mode || "").toLowerCase();
  const password = String(body.password || "");
  const username = String(body.username || "").trim().toLowerCase();

  if (mode === "sub" || username) {
    const subAdmin = await verifySubAdminLogin(env, username, password);
    if (!subAdmin) return error("Invalid sub-admin username or password", 401);
    const token = await createSignedSession({
      role: "subadmin",
      username: subAdmin.username,
      displayName: subAdmin.displayName,
      permissions: subAdmin.permissions
    }, env);
    return json({ ok: true, role: "subadmin", token, username: subAdmin.username, displayName: subAdmin.displayName, permissions: subAdmin.permissions });
  }

  if (!env.ADMIN_PASSWORD && !env.ADMIN_TOKEN) {
    return error("Master admin password is not configured", 500);
  }

  if (!constantTimeEqual(password, env.ADMIN_PASSWORD || "") && !constantTimeEqual(password, env.ADMIN_TOKEN || "")) {
    return error("Invalid master admin password", 401);
  }

  const token = await createSignedSession({ role: "master", username: "master", permissions: allPermissions() }, env);
  return json({ ok: true, role: "master", token, username: "master", displayName: "Master Admin", permissions: allPermissions() });
}
