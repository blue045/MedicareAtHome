import { getDb } from "./db.js";
import { constantTimeEqual, hashPasswordPbkdf2, isPbkdf2Hash, requiredSecret, sha256Hex, verifyPasswordPbkdf2 } from "./security.js";

export const ADMIN_MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "main", label: "Main Page" },
  { key: "content", label: "Content Pages" },
  { key: "contact", label: "Contact Settings" },
  { key: "blood", label: "Blood" },
  { key: "ambulance", label: "Ambulance" },
  { key: "doctors", label: "Doctors" },
  { key: "comments", label: "User Reviews" },
  { key: "store-users", label: "User Login Information" },
  { key: "orders", label: "Order Details" },
  { key: "products", label: "Add Products" },
  { key: "services", label: "Services" }
];

const MODULE_KEYS = new Set(ADMIN_MODULES.map((item) => item.key));

function cleanText(value = "", max = 180) {
  return String(value || "").trim().replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max);
}

export function normalizePermissionKey(value = "") {
  const key = cleanText(value, 40).toLowerCase();
  if (key === "reviews") return "comments";
  if (key === "add-products") return "products";
  if (key === "user-reviews") return "comments";
  if (key === "user-login-information") return "store-users";
  if (key === "order-details") return "orders";
  return key;
}

export function normalizePermissions(value = []) {
  const raw = Array.isArray(value) ? value : String(value || "").split(/[\s,]+/);
  const permissions = raw.map(normalizePermissionKey).filter((key) => MODULE_KEYS.has(key));
  return [...new Set(permissions)];
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(String(value || "")) ?? fallback;
  } catch {
    return fallback;
  }
}

function rowToSubAdmin(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    username: row.username || "",
    displayName: row.displayName || row.username || "Sub Admin",
    permissions: normalizePermissions(safeJsonParse(row.permissions, [])),
    isActive: row.isActive !== 0 && row.isActive !== "0",
    createdAt: row.createdAt || "",
    updatedAt: row.updatedAt || ""
  };
}

function adminSecret(env = {}) {
  return requiredSecret(env, ["ADMIN_SESSION_SECRET", "ADMIN_TOKEN", "ADMIN_PASSWORD"], "ADMIN_SESSION_SECRET or ADMIN_PASSWORD", 12);
}

async function legacySubAdminPasswordHash(username, password, env = {}) {
  const secret = String(env.ADMIN_PASSWORD || env.ADMIN_TOKEN || env.STORE_AUTH_SECRET || "medicare-admin-secret");
  return sha256Hex(`${String(username || "").toLowerCase()}:${String(password || "")}:${secret}`);
}

export async function hashSubAdminPassword(username, password, env = {}) {
  return hashPasswordPbkdf2(String(username || "").toLowerCase(), password, env, adminSecret(env));
}

async function verifySubAdminPassword(storedHash, username, password, env = {}) {
  if (isPbkdf2Hash(storedHash)) {
    return verifyPasswordPbkdf2(storedHash, String(username || "").toLowerCase(), password, env, adminSecret(env));
  }
  const legacy = await legacySubAdminPasswordHash(username, password, env);
  return constantTimeEqual(legacy, storedHash);
}

async function ensureAdminUsersSchema(db) {
  await db.execute(`CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    displayName TEXT,
    passwordHash TEXT NOT NULL,
    permissions TEXT NOT NULL,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT,
    updatedAt TEXT
  )`);
  await db.execute("CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users (username)");
}

export async function getAdminUsersDb(env) {
  const db = await getDb(env);
  await ensureAdminUsersSchema(db);
  return db;
}

export async function listSubAdmins(env) {
  const db = await getAdminUsersDb(env);
  const result = await db.execute({ sql: "SELECT * FROM admin_users ORDER BY createdAt DESC LIMIT 200", args: [] });
  return (result.rows || []).map(rowToSubAdmin);
}

export async function getSubAdminByUsername(env, username) {
  const db = await getAdminUsersDb(env);
  const cleanUsername = cleanText(username, 80).toLowerCase();
  const result = await db.execute({ sql: "SELECT * FROM admin_users WHERE username = ? LIMIT 1", args: [cleanUsername] });
  return result.rows?.[0] || null;
}

export async function verifySubAdminLogin(env, username, password) {
  const row = await getSubAdminByUsername(env, username);
  if (!row || row.isActive === 0 || row.isActive === "0") return null;
  const expected = String(row.passwordHash || "");
  if (!expected || !(await verifySubAdminPassword(expected, row.username, password, env))) return null;
  if (!isPbkdf2Hash(expected)) {
    const db = await getAdminUsersDb(env);
    await db.execute({ sql: "UPDATE admin_users SET passwordHash = ?, updatedAt = ? WHERE id = ?", args: [await hashSubAdminPassword(row.username, password, env), new Date().toISOString(), row.id] });
  }
  return rowToSubAdmin(row);
}

export async function createSubAdmin(env, input = {}) {
  const db = await getAdminUsersDb(env);
  const username = cleanText(input.username, 80).toLowerCase();
  const displayName = cleanText(input.displayName || input.name || username, 120) || username;
  const password = String(input.password || "");
  const permissions = normalizePermissions(input.permissions);
  if (!username || username.length < 3) throw new Error("Username must be at least 3 characters.");
  if (!password || password.length < 6) throw new Error("Password must be at least 6 characters.");
  if (!permissions.length) throw new Error("Select at least one permission module.");
  const now = new Date().toISOString();
  const passwordHash = await hashSubAdminPassword(username, password, env);
  const result = await db.execute({
    sql: "INSERT INTO admin_users (username, displayName, passwordHash, permissions, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [username, displayName, passwordHash, JSON.stringify(permissions), input.isActive === false ? 0 : 1, now, now]
  });
  const id = String(result.lastInsertRowid || "");
  return getSubAdminById(env, id);
}

export async function getSubAdminById(env, id) {
  const db = await getAdminUsersDb(env);
  const result = await db.execute({ sql: "SELECT * FROM admin_users WHERE id = ? LIMIT 1", args: [String(id || "")] });
  return rowToSubAdmin(result.rows?.[0]);
}

export async function updateSubAdmin(env, id, input = {}) {
  const db = await getAdminUsersDb(env);
  const current = await getSubAdminById(env, id);
  if (!current) throw new Error("Sub-admin not found.");
  const displayName = cleanText(input.displayName || input.name || current.displayName, 120) || current.displayName;
  const permissions = normalizePermissions(input.permissions || current.permissions);
  if (!permissions.length) throw new Error("Select at least one permission module.");
  const fields = ["displayName = ?", "permissions = ?", "isActive = ?", "updatedAt = ?"];
  const args = [displayName, JSON.stringify(permissions), input.isActive === false ? 0 : 1, new Date().toISOString()];
  if (String(input.password || "").trim()) {
    if (String(input.password).length < 6) throw new Error("Password must be at least 6 characters.");
    fields.push("passwordHash = ?");
    args.push(await hashSubAdminPassword(current.username, input.password, env));
  }
  args.push(String(id || ""));
  await db.execute({ sql: `UPDATE admin_users SET ${fields.join(", ")} WHERE id = ?`, args });
  return getSubAdminById(env, id);
}

export async function deleteSubAdmin(env, id) {
  const db = await getAdminUsersDb(env);
  const result = await db.execute({ sql: "DELETE FROM admin_users WHERE id = ?", args: [String(id || "")] });
  return Number(result.rowsAffected || 0);
}
