function cleanEnv(value = "") {
  return String(value || "").trim().replace(/^[\'\"]|[\'\"]$/g, "");
}

function textBytes(value = "") {
  return new TextEncoder().encode(String(value || ""));
}

function hexFromBytes(bytes) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomHex(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return hexFromBytes(bytes);
}

export function base64UrlEncode(text) {
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlDecode(text) {
  const normalized = String(text || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

export function constantTimeEqual(a = "", b = "") {
  const left = String(a || "");
  const right = String(b || "");
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return diff === 0;
}

export async function sha256Hex(text = "") {
  const digest = await crypto.subtle.digest("SHA-256", textBytes(text));
  return hexFromBytes(digest);
}

export async function hmacHex(text = "", secret = "") {
  if (!secret) throw new Error("Missing signing secret.");
  const key = await crypto.subtle.importKey("raw", textBytes(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, textBytes(text));
  return hexFromBytes(signature);
}

export function requiredSecret(env = {}, names = [], label = "secret", minLength = 16) {
  const values = (Array.isArray(names) ? names : [names]).map((name) => cleanEnv(env[name])).filter(Boolean);
  const value = values[0] || "";
  if (!value || value.length < minLength) {
    throw new Error(`${label} is required and must be at least ${minLength} characters. Add it in Cloudflare Pages environment variables.`);
  }
  return value;
}

function hashIterations(env = {}) {
  const value = Number(cleanEnv(env.PASSWORD_HASH_ITERATIONS || env.STORE_PASSWORD_HASH_ITERATIONS || "120000"));
  if (!Number.isFinite(value)) return 120000;
  return Math.max(60000, Math.min(250000, Math.round(value)));
}

export async function hashPasswordPbkdf2(identifier = "", password = "", env = {}, secret = "") {
  const iterations = hashIterations(env);
  const salt = randomHex(16);
  const pepper = cleanEnv(secret || env.STORE_PASSWORD_PEPPER || env.STORE_AUTH_SECRET || env.ADMIN_SESSION_SECRET || env.ADMIN_PASSWORD || env.ADMIN_TOKEN || "");
  const material = `${String(identifier || "").toLowerCase()}::${String(password || "")}::${pepper}`;
  const key = await crypto.subtle.importKey("raw", textBytes(material), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: textBytes(salt), iterations, hash: "SHA-256" }, key, 256);
  return `pbkdf2_sha256$${iterations}$${salt}$${hexFromBytes(derived)}`;
}

export async function verifyPasswordPbkdf2(stored = "", identifier = "", password = "", env = {}, secret = "") {
  const parts = String(stored || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") return false;
  const iterations = Math.max(1, Number(parts[1]) || 120000);
  const salt = parts[2];
  const expected = parts[3];
  const pepper = cleanEnv(secret || env.STORE_PASSWORD_PEPPER || env.STORE_AUTH_SECRET || env.ADMIN_SESSION_SECRET || env.ADMIN_PASSWORD || env.ADMIN_TOKEN || "");
  const material = `${String(identifier || "").toLowerCase()}::${String(password || "")}::${pepper}`;
  const key = await crypto.subtle.importKey("raw", textBytes(material), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: textBytes(salt), iterations, hash: "SHA-256" }, key, 256);
  return constantTimeEqual(hexFromBytes(derived), expected);
}

export function isPbkdf2Hash(value = "") {
  return String(value || "").startsWith("pbkdf2_sha256$");
}

function requestIdentity(request, env = {}) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
  const ua = (request.headers.get("user-agent") || "unknown-agent").slice(0, 180);
  const salt = cleanEnv(env.RATE_LIMIT_SALT || env.STORE_AUTH_SECRET || env.ADMIN_SESSION_SECRET || env.ADMIN_TOKEN || env.ADMIN_PASSWORD || "medicare-rate-limit");
  return `${ip}|${ua}|${salt}`;
}

async function ensureRateLimitSchema(db) {
  await db.execute(`CREATE TABLE IF NOT EXISTS request_rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    resetAt INTEGER NOT NULL,
    updatedAt TEXT
  )`);
  await db.execute("CREATE INDEX IF NOT EXISTS idx_request_rate_limits_reset ON request_rate_limits (resetAt)");
}

export async function rateLimitRequest(db, request, env = {}, bucket = "default", options = {}) {
  if (!db || cleanEnv(env.DISABLE_RATE_LIMITS).toLowerCase() === "1") return { ok: true };
  await ensureRateLimitSchema(db);
  const limit = Math.max(1, Number(options.limit || 10));
  const windowSeconds = Math.max(10, Number(options.windowSeconds || 60));
  const now = Math.floor(Date.now() / 1000);
  const resetAt = now + windowSeconds;
  const identityHash = await sha256Hex(`${bucket}:${requestIdentity(request, env)}`);
  const key = `${bucket}:${identityHash}`;
  await db.execute({ sql: "DELETE FROM request_rate_limits WHERE resetAt < ?", args: [now - 3600] });
  await db.execute({
    sql: `INSERT INTO request_rate_limits (key, count, resetAt, updatedAt)
          VALUES (?, 1, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            count = CASE WHEN request_rate_limits.resetAt <= ? THEN 1 ELSE request_rate_limits.count + 1 END,
            resetAt = CASE WHEN request_rate_limits.resetAt <= ? THEN excluded.resetAt ELSE request_rate_limits.resetAt END,
            updatedAt = excluded.updatedAt`,
    args: [key, resetAt, new Date().toISOString(), now, now]
  });
  const row = await db.execute({ sql: "SELECT count, resetAt FROM request_rate_limits WHERE key = ? LIMIT 1", args: [key] });
  const current = Number(row.rows?.[0]?.count || 0);
  const retryAfter = Math.max(1, Number(row.rows?.[0]?.resetAt || resetAt) - now);
  if (current > limit) return { ok: false, retryAfter };
  return { ok: true, remaining: Math.max(0, limit - current), retryAfter };
}

export async function createVerificationToken(db, userId, env = {}) {
  await db.execute(`CREATE TABLE IF NOT EXISTS store_email_verification_tokens (
    tokenHash TEXT PRIMARY KEY,
    userId INTEGER NOT NULL,
    expiresAt TEXT NOT NULL,
    usedAt TEXT,
    createdAt TEXT
  )`);
  await db.execute("CREATE INDEX IF NOT EXISTS idx_store_email_verify_user ON store_email_verification_tokens (userId, expiresAt)");
  const token = randomHex(32);
  const secret = requiredSecret(env, ["STORE_AUTH_SECRET", "ADMIN_SESSION_SECRET", "STORE_TURSO_AUTH_TOKEN", "STORE_LIBSQL_AUTH_TOKEN", "TURSO_AUTH_TOKEN", "LIBSQL_AUTH_TOKEN"], "STORE_AUTH_SECRET or ADMIN_SESSION_SECRET", 16);
  const tokenHash = await hmacHex(token, secret);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString();
  await db.execute({ sql: "INSERT INTO store_email_verification_tokens (tokenHash, userId, expiresAt, usedAt, createdAt) VALUES (?, ?, ?, '', ?)", args: [tokenHash, userId, expiresAt, now.toISOString()] });
  return token;
}

export async function verifyEmailTokenInDb(db, token, env = {}) {
  const cleanToken = cleanEnv(token);
  if (!cleanToken) return { ok: false, error: "Verification token is missing." };
  const secret = requiredSecret(env, ["STORE_AUTH_SECRET", "ADMIN_SESSION_SECRET", "STORE_TURSO_AUTH_TOKEN", "STORE_LIBSQL_AUTH_TOKEN", "TURSO_AUTH_TOKEN", "LIBSQL_AUTH_TOKEN"], "STORE_AUTH_SECRET or ADMIN_SESSION_SECRET", 16);
  const tokenHash = await hmacHex(cleanToken, secret);
  const result = await db.execute({ sql: "SELECT * FROM store_email_verification_tokens WHERE tokenHash = ? LIMIT 1", args: [tokenHash] });
  const row = result.rows?.[0];
  if (!row || row.usedAt) return { ok: false, error: "This verification link is invalid or already used." };
  if (new Date(row.expiresAt).getTime() < Date.now()) return { ok: false, error: "This verification link has expired. Please sign up again or contact support." };
  const now = new Date().toISOString();
  await db.batch([
    { sql: "UPDATE store_users SET emailVerified = 1, verifiedAt = ?, updatedAt = ? WHERE id = ?", args: [now, now, row.userId] },
    { sql: "UPDATE store_email_verification_tokens SET usedAt = ? WHERE tokenHash = ?", args: [now, tokenHash] }
  ]);
  return { ok: true, userId: String(row.userId) };
}
