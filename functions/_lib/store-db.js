import { createClient } from "@libsql/client/web";
import { base64UrlEncode, base64UrlDecode, constantTimeEqual, createVerificationToken, hmacHex, hashPasswordPbkdf2, isPbkdf2Hash, requiredSecret, sha256Hex, verifyEmailTokenInDb, verifyPasswordPbkdf2 } from "./security.js";

const clients = new Map();
const initialized = new Set();

function cleanEnv(value) {
  return String(value || "").trim().replace(/^[\'\"]|[\'\"]$/g, "");
}

function safeJsonParse(value, fallback) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value || ""));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function toIsoText(value) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function boolToInt(value) {
  return value === false || value === 0 || value === "0" ? 0 : 1;
}

function intToBool(value) {
  return !(value === false || value === 0 || value === "0");
}

function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cleanText(value, max = 500) {
  return String(value || "")
    .trim()
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .slice(0, max);
}

function cleanEmail(value) {
  return cleanText(value, 160).toLowerCase();
}

function cleanPhone(value) {
  return String(value || "")
    .replace(/[^0-9+\-\s]/g, "")
    .trim()
    .slice(0, 32);
}

function normalizePhoneForLogin(value) {
  return cleanPhone(value).replace(/[\s-]/g, "");
}

function phoneEmailPlaceholder(phone) {
  const digits = normalizePhoneForLogin(phone).replace(/[^0-9]/g, "");
  return digits ? `phone_${digits}@phone.local` : "";
}

function isPhoneEmailPlaceholder(email = "") {
  return /^phone_\d+@phone\.local$/i.test(String(email || ""));
}

function isGoogleEmailPlaceholder(email = "") {
  return /^google_[a-z0-9_-]+@google\.local$/i.test(String(email || ""));
}

function publicEmail(email = "") {
  return isPhoneEmailPlaceholder(email) || isGoogleEmailPlaceholder(email) ? "" : String(email || "");
}

function loginIdentifier(value = "") {
  const raw = cleanText(value, 160);
  return raw.includes("@") ? cleanEmail(raw) : normalizePhoneForLogin(raw);
}

function cleanImage(value, max = 800000) {
  const image = cleanText(value, max);
  if (!image) return "";
  if (/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image)) return image;
  if (/^https?:\/\//i.test(image) || image.startsWith("/")) return cleanText(image, 1200);
  return "";
}

function cleanPhotoList(value) {
  const list = Array.isArray(value) ? value : safeJsonParse(value, []);
  return list.map((item) => cleanImage(item)).filter(Boolean).slice(0, 8);
}

function cleanStatus(value) {
  const status = cleanText(value, 32).toLowerCase().replace(/[\s-]+/g, "_");
  if (status === "completed" || status === "complete") return "delivered";
  return ["pending", "pending_payment", "payment_submitted", "confirmed", "on_the_way", "delivered", "cancelled"].includes(status) ? status : "pending";
}

function cleanPaymentMethod(value) {
  const method = cleanText(value, 32).toLowerCase().replace(/[\s-]+/g, "_");
  if (method === "cash" || method === "cash_on_delivery" || method === "cod") return "cod";
  if (method === "bkash" || method === "b_kash") return "bkash";
  if (method === "nagad") return "nagad";
  if (["bkash_nagad", "bkash_and_nagad", "bkashnagad", "bkash/nagad"].includes(method)) return "bkash_nagad";
  return "cod";
}

function cleanDeliveryPaymentMethod(value) {
  const method = cleanText(value, 32).toLowerCase().replace(/[\s-]+/g, "_");
  if (method === "bkash" || method === "b_kash") return "bkash";
  if (method === "nagad") return "nagad";
  return "";
}

function cleanProductType(value) {
  const type = cleanText(value, 32).toLowerCase().replace(/[\s-]+/g, "_");
  if (["equipment", "medical_equipment", "medical-equipment"].includes(type)) return "equipment";
  return "medicine";
}

function cleanOrderType(value) {
  const type = cleanText(value, 32).toLowerCase().replace(/[\s-]+/g, "_");
  if (["prescription", "prescribed", "prescribed_medicine", "custom", "custom_prescription"].includes(type)) return "prescription";
  return "product";
}

function cleanPrescriptionFile(value, max = 1200000) {
  const file = cleanText(value, max);
  if (!file) return "";
  if (/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(file)) return file;
  if (/^data:application\/pdf;base64,/i.test(file)) return file;
  if (/^https?:\/\//i.test(file) || file.startsWith("/")) return cleanText(file, 1200);
  return "";
}

function tokenSecret(env) {
  // Store user sessions must use a real Cloudflare env secret.
  // This avoids the unsafe shared default that could be forged.
  return requiredSecret(env, ["STORE_AUTH_SECRET"], "STORE_AUTH_SECRET", 16);
}

function allowLegacyStoreSecrets(env = {}) {
  return cleanEnv(env.ALLOW_LEGACY_STORE_TOKENS).toLowerCase() === "1";
}

function tokenSecretCandidates(env) {
  const candidates = [tokenSecret(env)];
  if (allowLegacyStoreSecrets(env)) {
    candidates.push(cleanEnv(env.ADMIN_TOKEN || ""), cleanEnv(env.ADMIN_PASSWORD || ""), "medicare-store-secret");
  }
  return [...new Set(candidates.filter(Boolean))];
}

export function isEmailVerificationRequired(env = {}) {
  const value = cleanEnv(env.REQUIRE_EMAIL_VERIFICATION || env.STORE_REQUIRE_EMAIL_VERIFICATION).toLowerCase();
  return ["1", "true", "yes", "on"].includes(value);
}

async function legacyStorePasswordHash(identifier, password, env = {}) {
  const pepper = cleanEnv(env.STORE_PASSWORD_PEPPER || env.STORE_AUTH_SECRET || "medicare-store-password");
  const identity = loginIdentifier(identifier);
  return sha256Hex(`${identity}::${String(password || "")}::${pepper}`);
}

export async function hashPassword(identifier, password, env = {}) {
  const secret = requiredSecret(env, ["STORE_AUTH_SECRET"], "STORE_AUTH_SECRET", 16);
  const identity = loginIdentifier(identifier);
  return hashPasswordPbkdf2(identity, password, env, cleanEnv(env.STORE_PASSWORD_PEPPER || secret));
}

async function verifyStorePassword(storedHash, identifier, password, env = {}) {
  if (isPbkdf2Hash(storedHash)) {
    const secret = requiredSecret(env, ["STORE_AUTH_SECRET"], "STORE_AUTH_SECRET", 16);
    return verifyPasswordPbkdf2(storedHash, loginIdentifier(identifier), password, env, cleanEnv(env.STORE_PASSWORD_PEPPER || secret));
  }
  const legacy = await legacyStorePasswordHash(identifier, password, env);
  return constantTimeEqual(legacy, storedHash);
}

export async function createStoreToken(user, env) {
  const payload = {
    uid: String(user.id),
    email: cleanEmail(user.email),
    phone: normalizePhoneForLogin(user.phone || ""),
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const sig = await hmacHex(encoded, tokenSecret(env));
  return `${encoded}.${sig}`;
}

export async function verifyStoreToken(token, env) {
  const [encoded, sig] = String(token || "").split(".");
  if (!encoded || !sig) return null;
  const signatures = await Promise.all(tokenSecretCandidates(env).map((secret) => hmacHex(encoded, secret)));
  if (!signatures.some((expected) => constantTimeEqual(expected, sig))) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(encoded));
    if (!payload?.uid || Number(payload.exp || 0) < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getStoreUserFromRequest(request, env, db = null) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const payload = await verifyStoreToken(token, env);
  if (!payload) return null;
  const database = db || await getStoreDb(env);
  return getUserById(database, payload.uid);
}

export function getStoreTursoConfig(env) {
  const url = cleanEnv(env.STORE_TURSO_DATABASE_URL || env.STORE_TURSO_URL || env.STORE_LIBSQL_URL);
  const authToken = cleanEnv(env.STORE_TURSO_AUTH_TOKEN || env.STORE_LIBSQL_AUTH_TOKEN);

  if (!url) {
    throw new Error("Missing separate Store Turso database URL. Add STORE_TURSO_DATABASE_URL in Cloudflare Pages environment variables.");
  }
  if (!authToken) {
    throw new Error("Missing separate Store Turso auth token. Add STORE_TURSO_AUTH_TOKEN in Cloudflare Pages environment variables.");
  }
  if (!url.startsWith("libsql://") && !url.startsWith("https://") && !url.startsWith("http://")) {
    throw new Error("Invalid Store Turso database URL. It should look like libsql://your-store-db-your-org.turso.io");
  }
  return { url, authToken };
}

export function getStoreDbStatus(env) {
  const url = cleanEnv(env.STORE_TURSO_DATABASE_URL || env.STORE_TURSO_URL || env.STORE_LIBSQL_URL);
  const authToken = cleanEnv(env.STORE_TURSO_AUTH_TOKEN || env.STORE_LIBSQL_AUTH_TOKEN);
  return {
    hasDatabaseUrl: Boolean(url),
    hasAuthToken: Boolean(authToken),
    acceptedUrlNames: ["STORE_TURSO_DATABASE_URL", "STORE_TURSO_URL", "STORE_LIBSQL_URL"],
    acceptedTokenNames: ["STORE_TURSO_AUTH_TOKEN", "STORE_LIBSQL_AUTH_TOKEN"],
    separateFromMainDb: Boolean(url && url !== cleanEnv(env.TURSO_DATABASE_URL || env.TURSO_URL || env.LIBSQL_URL)),
    urlLooksValid: Boolean(url && (url.startsWith("libsql://") || url.startsWith("https://") || url.startsWith("http://")))
  };
}

export async function getStoreDb(env) {
  const { url, authToken } = getStoreTursoConfig(env);
  const cacheKey = `${url}::${authToken.slice(0, 12)}`;
  let client = clients.get(cacheKey);
  if (!client) {
    client = createClient({ url, authToken });
    clients.set(cacheKey, client);
  }
  if (!initialized.has(cacheKey)) {
    await ensureStoreSchema(client);
    initialized.add(cacheKey);
  }
  return client;
}

async function addStoreColumn(db, table, name, definition) {
  try {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  } catch (error) {
    const message = String(error?.message || error).toLowerCase();
    if (!message.includes("duplicate") && !message.includes("already exists")) {
      throw error;
    }
  }
}

async function ensureStoreSchema(db) {
  await db.execute(`CREATE TABLE IF NOT EXISTS store_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT NOT NULL,
    photoUrl TEXT,
    age INTEGER NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    passwordHash TEXT NOT NULL,
    googleId TEXT,
    authProvider TEXT DEFAULT 'password',
    emailVerified INTEGER DEFAULT 1,
    verifiedAt TEXT,
    createdAt TEXT,
    updatedAt TEXT
  )`);

  await addStoreColumn(db, "store_users", "phone", "TEXT");
  await addStoreColumn(db, "store_users", "googleId", "TEXT");
  await addStoreColumn(db, "store_users", "authProvider", "TEXT DEFAULT 'password'");
  await addStoreColumn(db, "store_users", "emailVerified", "INTEGER DEFAULT 1");
  await addStoreColumn(db, "store_users", "verifiedAt", "TEXT");
  try {
    await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS uniq_store_users_phone ON store_users (phone) WHERE phone IS NOT NULL AND phone != ''");
    await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS uniq_store_users_google_id ON store_users (googleId) WHERE googleId IS NOT NULL AND googleId != ''");
  } catch {
    // Existing duplicate phones should not block the site from loading.
  }

  await db.execute(`CREATE TABLE IF NOT EXISTS store_avatars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT,
    photoUrl TEXT NOT NULL,
    sortOrder INTEGER DEFAULT 99,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT,
    updatedAt TEXT
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS store_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    productType TEXT NOT NULL DEFAULT 'medicine',
    photoUrl TEXT,
    price REAL NOT NULL DEFAULT 0,
    deliveryCharge REAL NOT NULL DEFAULT 0,
    feniDeliveryCharge REAL NOT NULL DEFAULT 0,
    outsideFeniDeliveryCharge REAL NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    additionalPhotos TEXT,
    isActive INTEGER DEFAULT 1,
    sortOrder INTEGER DEFAULT 99,
    createdAt TEXT,
    updatedAt TEXT
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS store_cart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    productId INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT,
    updatedAt TEXT,
    UNIQUE(userId, productId)
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS store_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    productId INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    productName TEXT,
    productPrice REAL NOT NULL DEFAULT 0,
    deliveryCharge REAL NOT NULL DEFAULT 0,
    customerName TEXT NOT NULL,
    address TEXT NOT NULL,
    deliveryLocation TEXT,
    phone TEXT NOT NULL,
    paymentMethod TEXT NOT NULL DEFAULT 'cod',
    transactionId TEXT,
    senderNumber TEXT,
    deliveryPaymentMethod TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    createdAt TEXT,
    updatedAt TEXT
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS store_payment_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bkashNumber TEXT,
    nagadNumber TEXT,
    instructions TEXT,
    createdAt TEXT,
    updatedAt TEXT
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS store_email_verification_tokens (
    tokenHash TEXT PRIMARY KEY,
    userId INTEGER NOT NULL,
    expiresAt TEXT NOT NULL,
    usedAt TEXT,
    createdAt TEXT
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS store_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productId INTEGER NOT NULL,
    userId INTEGER,
    userName TEXT,
    rating INTEGER NOT NULL DEFAULT 5,
    comment TEXT NOT NULL,
    adminReply TEXT,
    isVisible INTEGER DEFAULT 1,
    createdAt TEXT,
    updatedAt TEXT
  )`);

  await addStoreColumn(db, "store_orders", "paymentMethod", "TEXT NOT NULL DEFAULT 'cod'");
  await addStoreColumn(db, "store_orders", "transactionId", "TEXT");
  await addStoreColumn(db, "store_orders", "senderNumber", "TEXT");
  await addStoreColumn(db, "store_orders", "deliveryPaymentMethod", "TEXT");
  await addStoreColumn(db, "store_orders", "deliveryLocation", "TEXT");

  await addStoreColumn(db, "store_products", "productType", "TEXT NOT NULL DEFAULT 'medicine'");
  await addStoreColumn(db, "store_products", "feniDeliveryCharge", "REAL NOT NULL DEFAULT 0");
  await addStoreColumn(db, "store_products", "outsideFeniDeliveryCharge", "REAL NOT NULL DEFAULT 0");

  await addStoreColumn(db, "store_orders", "orderType", "TEXT NOT NULL DEFAULT 'product'");
  await addStoreColumn(db, "store_orders", "prescriptionText", "TEXT");
  await addStoreColumn(db, "store_orders", "prescriptionFileUrl", "TEXT");
  await addStoreColumn(db, "store_orders", "prescriptionQuotedAt", "TEXT");

  await db.execute({
    sql: "UPDATE store_products SET feniDeliveryCharge = deliveryCharge, outsideFeniDeliveryCharge = deliveryCharge WHERE deliveryCharge > 0 AND feniDeliveryCharge = 0 AND outsideFeniDeliveryCharge = 0",
    args: []
  });

  await addStoreColumn(db, "store_comments", "parentId", "INTEGER");
  await addStoreColumn(db, "store_comments", "commenterType", "TEXT DEFAULT 'user'");
  await addStoreColumn(db, "store_comments", "isReview", "INTEGER DEFAULT 0");

  await db.execute("CREATE INDEX IF NOT EXISTS idx_store_products_active_sort ON store_products (isActive, sortOrder, createdAt)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_store_products_type_active_sort ON store_products (productType, isActive, sortOrder, createdAt)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_store_cart_user ON store_cart (userId, updatedAt)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_store_orders_user_status ON store_orders (userId, status, createdAt)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_store_comments_product ON store_comments (productId, isVisible, createdAt)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_store_comments_parent ON store_comments (parentId, createdAt)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_store_comments_user_review ON store_comments (userId, productId, isReview)");
  try {
    await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS uniq_store_user_product_review ON store_comments (userId, productId) WHERE isReview = 1 AND userId IS NOT NULL");
  } catch {
    // Keep old databases working even if duplicate historical reviews already exist.
    // New reviews are still blocked by hasUserReviewedProduct() below.
  }
  await db.execute("CREATE INDEX IF NOT EXISTS idx_store_avatars_active_sort ON store_avatars (isActive, sortOrder, createdAt)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_store_email_verify_user ON store_email_verification_tokens (userId, expiresAt)");

  await db.execute({
    sql: "UPDATE store_products SET description = '', updatedAt = ? WHERE description = ?",
    args: [new Date().toISOString(), "Starter store product. Edit or delete this from Superuser → Add Products."]
  });
}


async function getStoreTableColumns(db, table) {
  try {
    const result = await db.execute(`PRAGMA table_info(${table})`);
    return new Set((result.rows || []).map((row) => String(row.name || row[1] || "").trim()).filter(Boolean));
  } catch {
    return new Set();
  }
}

function storeProductColumnExpr(columns, name, fallback, alias = "", outputName = name) {
  const prefix = alias ? `${alias}.` : "";
  return columns.has(name) ? `${prefix}${name} AS ${outputName}` : `${fallback} AS ${outputName}`;
}

function storeProductBaseExpr(columns, alias = "") {
  const prefix = alias ? `${alias}.` : "";
  const deliveryFallback = columns.has("deliveryCharge") ? `${prefix}deliveryCharge` : "0";
  return [
    storeProductColumnExpr(columns, "id", "0", alias),
    storeProductColumnExpr(columns, "name", "'Product'", alias),
    storeProductColumnExpr(columns, "productType", "'medicine'", alias),
    storeProductColumnExpr(columns, "photoUrl", "''", alias),
    storeProductColumnExpr(columns, "price", "0", alias),
    storeProductColumnExpr(columns, "deliveryCharge", "0", alias),
    storeProductColumnExpr(columns, "feniDeliveryCharge", deliveryFallback, alias),
    storeProductColumnExpr(columns, "outsideFeniDeliveryCharge", deliveryFallback, alias),
    storeProductColumnExpr(columns, "stock", "0", alias),
    storeProductColumnExpr(columns, "description", "''", alias),
    storeProductColumnExpr(columns, "additionalPhotos", "'[]'", alias),
    storeProductColumnExpr(columns, "isActive", "1", alias),
    storeProductColumnExpr(columns, "sortOrder", "99", alias),
    storeProductColumnExpr(columns, "createdAt", "''", alias),
    storeProductColumnExpr(columns, "updatedAt", "''", alias)
  ].join(", ");
}

function storeProductOrderSql(columns, alias = "") {
  const prefix = alias ? `${alias}.` : "";
  const order = [];
  if (columns.has("sortOrder")) order.push(`${prefix}sortOrder ASC`);
  if (columns.has("createdAt")) order.push(`${prefix}createdAt DESC`);
  order.push(`${prefix}id DESC`);
  return order.join(", ");
}

function storeProductCartJoinExpr(columns) {
  const deliveryFallback = columns.has("deliveryCharge") ? "p.deliveryCharge" : "0";
  return [
    columns.has("name") ? "p.name AS productName" : "'Product' AS productName",
    columns.has("productType") ? "p.productType AS productType" : "'medicine' AS productType",
    columns.has("photoUrl") ? "p.photoUrl AS productPhotoUrl" : "'' AS productPhotoUrl",
    columns.has("price") ? "p.price AS productPrice" : "0 AS productPrice",
    columns.has("deliveryCharge") ? "p.deliveryCharge AS deliveryCharge" : "0 AS deliveryCharge",
    columns.has("feniDeliveryCharge") ? "p.feniDeliveryCharge AS feniDeliveryCharge" : `${deliveryFallback} AS feniDeliveryCharge`,
    columns.has("outsideFeniDeliveryCharge") ? "p.outsideFeniDeliveryCharge AS outsideFeniDeliveryCharge" : `${deliveryFallback} AS outsideFeniDeliveryCharge`,
    columns.has("stock") ? "p.stock AS stock" : "0 AS stock",
    columns.has("isActive") ? "p.isActive AS isActive" : "1 AS isActive"
  ].join(", ");
}

async function countRows(db, table) {
  const result = await db.execute(`SELECT COUNT(*) AS total FROM ${table}`);
  return Number(result.rows[0]?.total || 0);
}

function rowToUser(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    fullName: row.fullName || "",
    photoUrl: row.photoUrl || "",
    age: numberValue(row.age),
    email: publicEmail(row.email),
    phone: row.phone || "",
    authProvider: row.authProvider || (row.googleId ? "google" : "password"),
    emailVerified: row.emailVerified !== 0 && row.emailVerified !== "0",
    verifiedAt: row.verifiedAt || "",
    createdAt: row.createdAt || "",
    updatedAt: row.updatedAt || ""
  };
}

function rowToAvatar(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    label: row.label || "",
    photoUrl: row.photoUrl || "",
    sortOrder: numberValue(row.sortOrder, 99),
    isActive: intToBool(row.isActive),
    createdAt: row.createdAt || "",
    updatedAt: row.updatedAt || ""
  };
}

function rowToPaymentSettings(row) {
  return {
    id: row?.id ? String(row.id) : "",
    bkashNumber: row?.bkashNumber || "",
    nagadNumber: row?.nagadNumber || "",
    instructions: row?.instructions || "Send payment through bKash and Nagad first, then enter your sender number and Transaction ID. For Cash on Delivery, customers must pay the delivery fee first by bKash or Nagad; the product price is paid on delivery.",
    createdAt: row?.createdAt || "",
    updatedAt: row?.updatedAt || ""
  };
}

function isFeniDeliveryLocation(value = "") {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return true;
  if (text.includes("outside feni") || text.includes("outside of feni") || text.includes("out of feni") || text.includes("not feni") || text.includes("ফেনীর বাইরে")) return false;
  return /(^|[^a-z])feni([^a-z]|$)/i.test(text) || text.includes("ফেনী");
}

function feniRateFromRow(row = {}) {
  const legacy = numberValue(row.deliveryCharge);
  return numberValue(row.feniDeliveryCharge, legacy);
}

function outsideFeniRateFromRow(row = {}) {
  const feniRate = feniRateFromRow(row);
  return numberValue(row.outsideFeniDeliveryCharge, feniRate);
}

function deliveryChargeForLocation(product = {}, location = "") {
  return isFeniDeliveryLocation(location) ? feniRateFromRow(product) : outsideFeniRateFromRow(product);
}

function rowToProduct(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    name: row.name || "",
    productType: cleanProductType(row.productType || "medicine"),
    photoUrl: row.photoUrl || "",
    price: numberValue(row.price),
    deliveryCharge: feniRateFromRow(row),
    feniDeliveryCharge: feniRateFromRow(row),
    outsideFeniDeliveryCharge: outsideFeniRateFromRow(row),
    stock: Math.max(0, Math.round(numberValue(row.stock))),
    description: row.description || "",
    additionalPhotos: cleanPhotoList(row.additionalPhotos),
    isActive: intToBool(row.isActive),
    sortOrder: numberValue(row.sortOrder, 99),
    createdAt: row.createdAt || "",
    updatedAt: row.updatedAt || ""
  };
}

function rowToCartItem(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    userId: String(row.userId),
    productId: String(row.productId),
    orderType: cleanOrderType(row.orderType || "product"),
    quantity: Math.max(1, Math.round(numberValue(row.quantity, 1))),
    product: row.productName ? {
      id: String(row.productId),
      name: row.productName || "",
      productType: cleanProductType(row.productType || "medicine"),
      photoUrl: row.productPhotoUrl || "",
      price: numberValue(row.productPrice),
      deliveryCharge: feniRateFromRow(row),
      feniDeliveryCharge: feniRateFromRow(row),
      outsideFeniDeliveryCharge: outsideFeniRateFromRow(row),
      stock: Math.max(0, Math.round(numberValue(row.stock))),
      isActive: intToBool(row.isActive)
    } : null,
    createdAt: row.createdAt || "",
    updatedAt: row.updatedAt || ""
  };
}

function rowToOrder(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    userId: String(row.userId),
    productId: String(row.productId),
    orderType: cleanOrderType(row.orderType || "product"),
    quantity: Math.max(1, Math.round(numberValue(row.quantity, 1))),
    productName: row.productName || "",
    productPrice: numberValue(row.productPrice),
    deliveryCharge: numberValue(row.deliveryCharge),
    customerName: row.customerName || "",
    address: row.address || "",
    deliveryLocation: row.deliveryLocation || "",
    phone: row.phone || "",
    paymentMethod: cleanPaymentMethod(row.paymentMethod),
    transactionId: row.transactionId || "",
    senderNumber: row.senderNumber || "",
    deliveryPaymentMethod: cleanDeliveryPaymentMethod(row.deliveryPaymentMethod),
    prescriptionText: row.prescriptionText || "",
    prescriptionFileUrl: row.prescriptionFileUrl || "",
    prescriptionQuotedAt: row.prescriptionQuotedAt || "",
    status: cleanStatus(row.status),
    userName: row.userName || "",
    userEmail: publicEmail(row.userEmail),
    userPhone: row.userPhone || "",
    createdAt: row.createdAt || "",
    updatedAt: row.updatedAt || ""
  };
}

function rowToComment(row) {
  if (!row) return null;
  const isReview = row.isReview === true || row.isReview === 1 || row.isReview === "1";
  return {
    id: String(row.id),
    productId: String(row.productId),
    parentId: row.parentId ? String(row.parentId) : "",
    userId: row.userId ? String(row.userId) : "",
    userName: row.userName || "",
    commenterType: row.commenterType || "user",
    isReview,
    rating: isReview ? Math.min(5, Math.max(1, Math.round(numberValue(row.rating, 5)))) : 0,
    comment: row.comment || "",
    adminReply: row.adminReply || "",
    isVisible: intToBool(row.isVisible),
    productName: row.productName || "",
    createdAt: row.createdAt || "",
    updatedAt: row.updatedAt || ""
  };
}

export function sanitizeUserInput(input = {}) {
  const fullName = cleanText(input.fullName, 140);
  const rawPhotoUrl = String(input.photoUrl ?? "").trim();
  const photoUrl = cleanImage(rawPhotoUrl);
  const age = Math.max(1, Math.min(120, Math.round(numberValue(input.age))));
  const email = cleanEmail(input.email);
  const phone = normalizePhoneForLogin(input.phone || input.mobile || "");
  const password = String(input.password || "");
  if (!fullName || !password || !age || (!email && !phone)) return { ok: false, error: "Full name, age, email or phone, and password are required." };
  if (rawPhotoUrl && !photoUrl) return { ok: false, error: "Profile photo must be a valid JPG, PNG, WEBP, http URL, or site image path." };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (phone && phone.replace(/[^0-9]/g, "").length < 8) return { ok: false, error: "Enter a valid phone number." };
  if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  return { ok: true, value: { fullName, photoUrl, age, email, phone, password } };
}

export function sanitizeProfileUpdateInput(input = {}) {
  const fullName = cleanText(input.fullName, 140);
  const rawPhotoUrl = String(input.photoUrl ?? "").trim();
  const photoUrl = cleanImage(rawPhotoUrl);
  const age = Math.max(1, Math.min(120, Math.round(numberValue(input.age))));

  if (!fullName || !age) return { ok: false, error: "Full name and age are required." };
  if (rawPhotoUrl && !photoUrl) return { ok: false, error: "Profile photo must be a valid JPG, PNG, WEBP, http URL, or site image path." };

  return { ok: true, value: { fullName, age, photoUrl } };
}

export function sanitizeAvatarInput(input = {}, existing = {}) {
  const avatar = {
    label: cleanText(input.label, 80) || existing.label || "Profile photo",
    photoUrl: cleanImage(input.photoUrl) || (input.photoUrl === "" ? "" : existing.photoUrl || ""),
    sortOrder: Math.round(numberValue(input.sortOrder, existing.sortOrder || 99)),
    isActive: input.isActive === undefined ? existing.isActive !== false : input.isActive !== false,
    updatedAt: new Date()
  };
  if (!avatar.photoUrl) return { ok: false, error: "Profile photo is required." };
  return { ok: true, value: { ...existing, ...avatar, createdAt: existing.createdAt || new Date() } };
}

export function sanitizeProductInput(input = {}, existing = {}) {
  const existingFeniRate = numberValue(existing.feniDeliveryCharge, existing.deliveryCharge || 0);
  const existingOutsideRate = numberValue(existing.outsideFeniDeliveryCharge, existingFeniRate);
  const feniDeliveryCharge = Math.max(0, numberValue(input.feniDeliveryCharge ?? input.deliveryCharge, existingFeniRate));
  const outsideFeniDeliveryCharge = Math.max(0, numberValue(input.outsideFeniDeliveryCharge, input.deliveryCharge === undefined ? existingOutsideRate : feniDeliveryCharge));
  const product = {
    name: cleanText(input.name, 160) || existing.name || "",
    productType: cleanProductType(input.productType ?? existing.productType ?? "medicine"),
    photoUrl: cleanImage(input.photoUrl) || (input.photoUrl === "" ? "" : existing.photoUrl || ""),
    price: Math.max(0, numberValue(input.price, existing.price || 0)),
    deliveryCharge: feniDeliveryCharge,
    feniDeliveryCharge,
    outsideFeniDeliveryCharge,
    stock: Math.max(0, Math.round(numberValue(input.stock, existing.stock || 0))),
    description: cleanText(input.description, 1600) || existing.description || "",
    additionalPhotos: cleanPhotoList(input.additionalPhotos ?? existing.additionalPhotos),
    isActive: input.isActive === undefined ? existing.isActive !== false : input.isActive !== false,
    sortOrder: Math.round(numberValue(input.sortOrder, existing.sortOrder || 99)),
    updatedAt: new Date()
  };
  if (!product.name) return { ok: false, error: "Product name is required." };
  if (!product.price) return { ok: false, error: "Product price is required." };
  return { ok: true, value: { ...existing, ...product, createdAt: existing.createdAt || new Date() } };
}

export function sanitizeCheckoutInput(input = {}) {
  const customerName = cleanText(input.fullName || input.customerName, 140);
  const address = cleanText(input.address, 400);
  const deliveryLocation = cleanText(input.deliveryLocation, 120);
  const phone = cleanPhone(input.phone);
  const productId = cleanText(input.productId, 40);
  const quantity = Math.max(1, Math.min(50, Math.round(numberValue(input.quantity, 1))));
  const paymentMethod = cleanPaymentMethod(input.paymentMethod || "cod");
  const deliveryPaymentMethod = cleanDeliveryPaymentMethod(input.deliveryPaymentMethod || input.codAdvanceMethod || "");
  const transactionId = cleanText(input.transactionId, 80);
  const senderNumber = cleanPhone(input.senderNumber);
  if (!customerName || !address || !phone || !productId) return { ok: false, error: "Full name, address, phone and product are required." };
  if (paymentMethod !== "cod" && (!senderNumber || !transactionId)) return { ok: false, error: "Sender number and Transaction ID are required for bKash and Nagad payment." };
  if (paymentMethod === "cod" && (!deliveryPaymentMethod || !senderNumber || !transactionId)) return { ok: false, error: "For Cash on Delivery, pay the delivery fee first by bKash or Nagad, then enter sender number and Transaction ID." };
  return { ok: true, value: { customerName, address, deliveryLocation, phone, productId, quantity, paymentMethod, deliveryPaymentMethod, transactionId, senderNumber } };
}

export function sanitizePrescriptionOrderInput(input = {}) {
  const customerName = cleanText(input.fullName || input.customerName, 140);
  const address = cleanText(input.address, 600);
  const deliveryLocation = cleanText(input.deliveryLocation, 160);
  const phone = cleanPhone(input.phone);
  const medicineName = cleanText(input.medicineName || input.customMedicineName, 220);
  const quantity = Math.max(1, Math.min(99, Math.round(numberValue(input.quantity, 1))));
  const prescriptionText = cleanText(input.prescriptionText || input.prescriptionNote || "", 1200);
  const prescriptionFileUrl = cleanPrescriptionFile(input.prescriptionFileUrl || input.prescriptionFile || "");
  if (!customerName || !address || !phone) return { ok: false, error: "Full name, address and phone are required." };
  if (!medicineName && !prescriptionText && !prescriptionFileUrl) return { ok: false, error: "Type the medicine name or upload/provide a prescription." };
  return { ok: true, value: { customerName, address, deliveryLocation, phone, medicineName, quantity, prescriptionText, prescriptionFileUrl } };
}

export function sanitizeOrderPaymentInput(input = {}) {
  const paymentMethod = cleanPaymentMethod(input.paymentMethod || "cod");
  const deliveryPaymentMethod = cleanDeliveryPaymentMethod(input.deliveryPaymentMethod || input.codAdvanceMethod || "");
  const transactionId = cleanText(input.transactionId, 80);
  const senderNumber = cleanPhone(input.senderNumber);
  if (paymentMethod !== "cod" && (!senderNumber || !transactionId)) return { ok: false, error: "Sender number and Transaction ID are required for bKash and Nagad payment." };
  if (paymentMethod === "cod" && (!deliveryPaymentMethod || !senderNumber || !transactionId)) return { ok: false, error: "For Cash on Delivery, pay the delivery fee first by bKash or Nagad, then enter sender number and Transaction ID." };
  return { ok: true, value: { paymentMethod, deliveryPaymentMethod, transactionId, senderNumber } };
}

export function sanitizePrescriptionQuoteInput(input = {}) {
  const productPrice = Math.max(0, numberValue(input.productPrice ?? input.quoteProductPrice ?? input.price, 0));
  const deliveryCharge = Math.max(0, numberValue(input.deliveryCharge ?? input.quoteDeliveryCharge, 0));
  if (!Number.isFinite(productPrice) || productPrice <= 0) return { ok: false, error: "Medicine price is required." };
  if (!Number.isFinite(deliveryCharge)) return { ok: false, error: "Delivery charge is invalid." };
  return { ok: true, value: { productPrice, deliveryCharge } };
}

export function sanitizePaymentSettingsInput(input = {}, existing = {}) {
  return {
    bkashNumber: cleanPhone(input.bkashNumber ?? existing.bkashNumber ?? ""),
    nagadNumber: cleanPhone(input.nagadNumber ?? existing.nagadNumber ?? ""),
    instructions: cleanText(input.instructions ?? existing.instructions ?? "", 700) || rowToPaymentSettings(existing).instructions,
    createdAt: existing.createdAt || new Date(),
    updatedAt: new Date()
  };
}

export function sanitizeCommentInput(input = {}) {
  const productId = cleanText(input.productId, 40);
  const parentId = cleanText(input.parentId, 40);
  const isReview = input.isReview === true || input.type === "review";
  const rating = isReview ? Math.min(5, Math.max(1, Math.round(numberValue(input.rating, 5)))) : 0;
  const comment = cleanText(input.comment || input.reply, 900);
  const userName = cleanText(input.userName || input.name, 140);
  if (!productId || !comment) return { ok: false, error: "Product and review are required." };
  if (!isReview || parentId) return { ok: false, error: "Public replies are disabled. Only verified delivered customers can submit product reviews from their profile." };
  return { ok: true, value: { productId, parentId: "", rating, comment, userName, isReview: true } };
}

export async function createUser(db, input, env) {
  const phone = normalizePhoneForLogin(input.phone || "");
  const email = cleanEmail(input.email);
  const storedEmail = email || phoneEmailPlaceholder(phone);
  const needsVerification = Boolean(email && isEmailVerificationRequired(env));
  const passwordHash = await hashPassword(email || phone, input.password, env);
  const now = toIsoText(input.createdAt);
  const result = await db.execute({
    sql: `INSERT INTO store_users (fullName, photoUrl, age, email, phone, passwordHash, emailVerified, verifiedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [input.fullName, input.photoUrl || "", input.age, storedEmail, phone, passwordHash, needsVerification ? 0 : 1, needsVerification ? "" : now, now, toIsoText(input.updatedAt)]
  });
  return getUserById(db, String(result.lastInsertRowid));
}

export async function getUserByEmail(db, email) {
  const result = await db.execute({ sql: "SELECT * FROM store_users WHERE email = ? LIMIT 1", args: [cleanEmail(email)] });
  return result.rows[0] || null;
}

export async function getUserByPhone(db, phone) {
  const normalized = normalizePhoneForLogin(phone);
  if (!normalized) return null;
  const result = await db.execute({ sql: "SELECT * FROM store_users WHERE phone = ? LIMIT 1", args: [normalized] });
  return result.rows[0] || null;
}

export async function getUserByGoogleId(db, googleId) {
  const id = cleanText(googleId, 180);
  if (!id) return null;
  const result = await db.execute({ sql: "SELECT * FROM store_users WHERE googleId = ? LIMIT 1", args: [id] });
  return result.rows[0] || null;
}


export async function createOrLinkGoogleUser(db, googleProfile = {}, env = {}) {
  const googleId = cleanText(googleProfile.sub, 180);
  const email = cleanEmail(googleProfile.email);
  const emailVerified = googleProfile.email_verified === true || googleProfile.email_verified === "true";
  const fullName = cleanText(googleProfile.name || googleProfile.given_name || (email ? email.split("@")[0] : "Google User"), 140) || "Google User";
  const photoUrl = cleanImage(googleProfile.picture || "");
  if (!googleId) throw new Error("Google account ID was missing. Please try again.");

  const byGoogleId = await getUserByGoogleId(db, googleId);
  if (byGoogleId) {
    const now = new Date().toISOString();
    const nextName = byGoogleId.fullName || fullName;
    const nextPhoto = byGoogleId.photoUrl || photoUrl || "";
    await db.execute({
      sql: "UPDATE store_users SET fullName = ?, photoUrl = ?, authProvider = ?, updatedAt = ? WHERE id = ?",
      args: [nextName, nextPhoto, "google", now, byGoogleId.id]
    });
    return { user: await getUserById(db, String(byGoogleId.id)), isNewUser: false, linkedExisting: false };
  }

  if (email && emailVerified) {
    const byEmail = await getUserByEmail(db, email);
    if (byEmail) {
      const now = new Date().toISOString();
      const nextPhoto = byEmail.photoUrl || photoUrl || "";
      await db.execute({
        sql: "UPDATE store_users SET googleId = ?, authProvider = ?, photoUrl = ?, emailVerified = 1, verifiedAt = COALESCE(NULLIF(verifiedAt, ''), ?), updatedAt = ? WHERE id = ?",
        args: [googleId, "google", nextPhoto, now, now, byEmail.id]
      });
      return { user: await getUserById(db, String(byEmail.id)), isNewUser: false, linkedExisting: true };
    }
  }

  const storedEmail = email || `google_${googleId.replace(/[^a-z0-9_-]/gi, "").slice(0, 90).toLowerCase()}@google.local`;
  const now = new Date().toISOString();
  const impossiblePassword = crypto.randomUUID ? crypto.randomUUID() : `${googleId}.${Date.now()}.${Math.random()}`;
  const passwordHash = await hashPassword(storedEmail, impossiblePassword, env);
  const result = await db.execute({
    sql: `INSERT INTO store_users (fullName, photoUrl, age, email, phone, passwordHash, googleId, authProvider, emailVerified, verifiedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    args: [fullName, photoUrl, 18, storedEmail, "", passwordHash, googleId, "google", now, now, now]
  });
  return { user: await getUserById(db, String(result.lastInsertRowid)), isNewUser: true, linkedExisting: false };
}

export async function getUserByLoginIdentifier(db, identifier) {
  const value = loginIdentifier(identifier);
  if (!value) return null;
  if (value.includes("@")) return getUserByEmail(db, value);
  return getUserByPhone(db, value);
}

export async function getUserById(db, id) {
  const result = await db.execute({ sql: "SELECT * FROM store_users WHERE id = ? LIMIT 1", args: [id] });
  return rowToUser(result.rows[0]);
}

export async function verifyLogin(db, identifier, password, env) {
  const row = await getUserByLoginIdentifier(db, identifier);
  if (!row) return null;
  const hashKey = isPhoneEmailPlaceholder(row.email) ? row.phone : (row.email || row.phone);
  const valid = await verifyStorePassword(String(row.passwordHash || ""), hashKey, password, env);
  if (!valid) return null;
  if (isEmailVerificationRequired(env) && publicEmail(row.email) && (row.emailVerified === 0 || row.emailVerified === "0")) {
    throw new Error("Please verify your email before logging in. Check your inbox for the verification link.");
  }
  if (!isPbkdf2Hash(row.passwordHash)) {
    const upgraded = await hashPassword(hashKey, password, env);
    await db.execute({ sql: "UPDATE store_users SET passwordHash = ?, updatedAt = ? WHERE id = ?", args: [upgraded, new Date().toISOString(), row.id] });
  }
  return rowToUser(row);
}

export async function listUsers(db) {
  const result = await db.execute({ sql: "SELECT * FROM store_users ORDER BY createdAt DESC LIMIT 500", args: [] });
  return result.rows.map(rowToUser);
}

export async function updateUserProfile(db, id, input = {}) {
  const result = sanitizeProfileUpdateInput(input);
  if (!result.ok) return result;

  const existing = await db.execute({ sql: "SELECT * FROM store_users WHERE id = ? LIMIT 1", args: [id] });
  if (!existing.rows[0]) return { ok: false, error: "User not found", status: 404 };

  const updatedAt = new Date().toISOString();
  await db.execute({
    sql: "UPDATE store_users SET fullName = ?, age = ?, photoUrl = ?, updatedAt = ? WHERE id = ?",
    args: [result.value.fullName, result.value.age, result.value.photoUrl || "", updatedAt, id]
  });
  return { ok: true, user: await getUserById(db, id) };
}

export async function updateUserPassword(db, id, password, env) {
  const newPassword = String(password || "").trim();
  if (newPassword.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }
  const existing = await db.execute({ sql: "SELECT * FROM store_users WHERE id = ? LIMIT 1", args: [id] });
  const row = existing.rows[0];
  if (!row) return { ok: false, error: "User not found", status: 404 };
  const hashKey = isPhoneEmailPlaceholder(row.email) ? row.phone : (row.email || row.phone);
  const passwordHash = await hashPassword(hashKey, newPassword, env);
  const updatedAt = new Date().toISOString();
  await db.execute({
    sql: "UPDATE store_users SET passwordHash = ?, updatedAt = ? WHERE id = ?",
    args: [passwordHash, updatedAt, id]
  });
  return { ok: true, user: await getUserById(db, id) };
}

export async function updateCurrentUserPassword(db, id, input = {}, env = {}) {
  const newPassword = String(input.newPassword || input.password || "").trim();
  const currentPassword = String(input.currentPassword || "");
  if (newPassword.length < 6) return { ok: false, error: "New password must be at least 6 characters." };

  const existing = await db.execute({ sql: "SELECT * FROM store_users WHERE id = ? LIMIT 1", args: [id] });
  const row = existing.rows[0];
  if (!row) return { ok: false, error: "User not found", status: 404 };

  const provider = String(row.authProvider || (row.googleId ? "google" : "password")).toLowerCase();
  const hashKey = isPhoneEmailPlaceholder(row.email) ? row.phone : (row.email || row.phone);
  const shouldCheckCurrentPassword = currentPassword || !provider.includes("google");

  if (shouldCheckCurrentPassword) {
    if (!currentPassword) return { ok: false, error: "Current password is required." };
    const currentHash = await hashPassword(hashKey, currentPassword, env);
    if (currentHash !== row.passwordHash) return { ok: false, error: "Current password is incorrect.", status: 401 };
  }

  const passwordHash = await hashPassword(hashKey, newPassword, env);
  const nextProvider = "password";
  const updatedAt = new Date().toISOString();
  await db.execute({
    sql: "UPDATE store_users SET passwordHash = ?, authProvider = ?, updatedAt = ? WHERE id = ?",
    args: [passwordHash, nextProvider, updatedAt, id]
  });
  return { ok: true, user: await getUserById(db, id) };
}

export async function deleteUser(db, id) {
  await db.execute({ sql: "DELETE FROM store_cart WHERE userId = ?", args: [id] });
  const result = await db.execute({ sql: "DELETE FROM store_users WHERE id = ?", args: [id] });
  return Number(result.rowsAffected || 0);
}

export async function listAvatars(db, includeInactive = false) {
  const result = await db.execute({
    sql: includeInactive
      ? "SELECT * FROM store_avatars ORDER BY sortOrder ASC, createdAt DESC LIMIT 200"
      : "SELECT * FROM store_avatars WHERE isActive != 0 ORDER BY sortOrder ASC, createdAt DESC LIMIT 100",
    args: []
  });
  return result.rows.map(rowToAvatar);
}

export async function getAvatarById(db, id) {
  const result = await db.execute({ sql: "SELECT * FROM store_avatars WHERE id = ? LIMIT 1", args: [id] });
  return rowToAvatar(result.rows[0]);
}

export async function avatarPhotoExists(db, photoUrl) {
  const photo = cleanImage(photoUrl);
  if (!photo) return false;
  const result = await db.execute({ sql: "SELECT COUNT(*) AS total FROM store_avatars WHERE photoUrl = ? AND isActive != 0", args: [photo] });
  return Number(result.rows[0]?.total || 0) > 0;
}

export async function createAvatar(db, avatar) {
  const result = await db.execute({
    sql: `INSERT INTO store_avatars (label, photoUrl, sortOrder, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [avatar.label || "Profile photo", avatar.photoUrl, avatar.sortOrder || 99, boolToInt(avatar.isActive), toIsoText(avatar.createdAt), toIsoText(avatar.updatedAt)]
  });
  return getAvatarById(db, String(result.lastInsertRowid));
}

export async function updateAvatar(db, id, avatar) {
  await db.execute({
    sql: "UPDATE store_avatars SET label = ?, photoUrl = ?, sortOrder = ?, isActive = ?, updatedAt = ? WHERE id = ?",
    args: [avatar.label || "Profile photo", avatar.photoUrl, avatar.sortOrder || 99, boolToInt(avatar.isActive), toIsoText(avatar.updatedAt), id]
  });
  return getAvatarById(db, id);
}

export async function deleteAvatar(db, id) {
  const result = await db.execute({ sql: "DELETE FROM store_avatars WHERE id = ?", args: [id] });
  return Number(result.rowsAffected || 0);
}

export async function getPaymentSettings(db) {
  const result = await db.execute({ sql: "SELECT * FROM store_payment_settings ORDER BY id ASC LIMIT 1", args: [] });
  return rowToPaymentSettings(result.rows[0]);
}

export async function updatePaymentSettings(db, input) {
  const current = await getPaymentSettings(db);
  const settings = sanitizePaymentSettingsInput(input, current);
  if (current.id) {
    await db.execute({
      sql: "UPDATE store_payment_settings SET bkashNumber = ?, nagadNumber = ?, instructions = ?, updatedAt = ? WHERE id = ?",
      args: [settings.bkashNumber, settings.nagadNumber, settings.instructions, toIsoText(settings.updatedAt), current.id]
    });
    return getPaymentSettings(db);
  }
  const result = await db.execute({
    sql: "INSERT INTO store_payment_settings (bkashNumber, nagadNumber, instructions, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
    args: [settings.bkashNumber, settings.nagadNumber, settings.instructions, toIsoText(settings.createdAt), toIsoText(settings.updatedAt)]
  });
  const created = await db.execute({ sql: "SELECT * FROM store_payment_settings WHERE id = ? LIMIT 1", args: [String(result.lastInsertRowid)] });
  return rowToPaymentSettings(created.rows[0]);
}

export async function listProducts(db, includeInactive = false) {
  const columns = await getStoreTableColumns(db, "store_products");
  const select = storeProductBaseExpr(columns);
  const where = includeInactive || !columns.has("isActive") ? "" : " WHERE isActive != 0";
  const limit = includeInactive ? 500 : 250;
  const result = await db.execute({
    sql: `SELECT ${select} FROM store_products${where} ORDER BY ${storeProductOrderSql(columns)} LIMIT ${limit}`,
    args: []
  });
  return result.rows.map(rowToProduct);
}

export async function getProductById(db, id, includeInactive = false) {
  const columns = await getStoreTableColumns(db, "store_products");
  const select = storeProductBaseExpr(columns);
  const activeCondition = includeInactive || !columns.has("isActive") ? "" : " AND isActive != 0";
  const result = await db.execute({
    sql: `SELECT ${select} FROM store_products WHERE id = ?${activeCondition} LIMIT 1`,
    args: [id]
  });
  return rowToProduct(result.rows[0]);
}

export async function createProduct(db, product) {
  const result = await db.execute({
    sql: `INSERT INTO store_products (name, productType, photoUrl, price, deliveryCharge, feniDeliveryCharge, outsideFeniDeliveryCharge, stock, description, additionalPhotos, isActive, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [product.name, product.productType || "medicine", product.photoUrl || "", product.price, product.deliveryCharge, product.feniDeliveryCharge, product.outsideFeniDeliveryCharge, product.stock, product.description || "", JSON.stringify(product.additionalPhotos || []), boolToInt(product.isActive), product.sortOrder || 99, toIsoText(product.createdAt), toIsoText(product.updatedAt)]
  });
  return getProductById(db, String(result.lastInsertRowid), true);
}

export async function updateProduct(db, id, product) {
  await db.execute({
    sql: `UPDATE store_products SET name = ?, productType = ?, photoUrl = ?, price = ?, deliveryCharge = ?, feniDeliveryCharge = ?, outsideFeniDeliveryCharge = ?, stock = ?, description = ?, additionalPhotos = ?, isActive = ?, sortOrder = ?, updatedAt = ? WHERE id = ?`,
    args: [product.name, product.productType || "medicine", product.photoUrl || "", product.price, product.deliveryCharge, product.feniDeliveryCharge, product.outsideFeniDeliveryCharge, product.stock, product.description || "", JSON.stringify(product.additionalPhotos || []), boolToInt(product.isActive), product.sortOrder || 99, toIsoText(product.updatedAt), id]
  });
  return getProductById(db, id, true);
}

export async function deleteProduct(db, id) {
  const result = await db.execute({ sql: "DELETE FROM store_products WHERE id = ?", args: [id] });
  return Number(result.rowsAffected || 0);
}

export async function listCart(db, userId) {
  const productColumns = await getStoreTableColumns(db, "store_products");
  const result = await db.execute({
    sql: `SELECT c.*, ${storeProductCartJoinExpr(productColumns)}
          FROM store_cart c LEFT JOIN store_products p ON p.id = c.productId
          WHERE c.userId = ? ORDER BY c.updatedAt DESC LIMIT 200`,
    args: [userId]
  });
  return result.rows.map(rowToCartItem);
}

export async function addToCart(db, userId, productId, quantity = 1) {
  const product = await getProductById(db, productId);
  if (!product) throw new Error("Product not found.");
  if (product.stock <= 0) throw new Error("This product is out of stock.");
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO store_cart (userId, productId, quantity, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(userId, productId) DO UPDATE SET quantity = quantity + excluded.quantity, updatedAt = excluded.updatedAt`,
    args: [userId, productId, Math.max(1, Math.round(numberValue(quantity, 1))), now, now]
  });
  return listCart(db, userId);
}

export async function removeCartItem(db, userId, cartId) {
  const result = await db.execute({ sql: "DELETE FROM store_cart WHERE id = ? AND userId = ?", args: [cartId, userId] });
  return Number(result.rowsAffected || 0);
}

export async function createOrder(db, userId, checkout) {
  const product = await getProductById(db, checkout.productId);
  if (!product) throw new Error("Product not found.");
  if (product.stock < checkout.quantity) throw new Error("Not enough stock available.");
  const paymentSettings = await getPaymentSettings(db);
  if (checkout.paymentMethod === "bkash" || checkout.paymentMethod === "nagad") {
    const configuredNumber = checkout.paymentMethod === "bkash" ? paymentSettings.bkashNumber : paymentSettings.nagadNumber;
    if (!configuredNumber) throw new Error(`${checkout.paymentMethod === "bkash" ? "bKash" : "Nagad"} payment number is not configured yet. Please use Cash on Delivery.`);
  }
  if (checkout.paymentMethod === "bkash_nagad" && !paymentSettings.bkashNumber && !paymentSettings.nagadNumber) {
    throw new Error("bKash/Nagad payment number is not configured yet. Please use Cash on Delivery.");
  }
  if (checkout.paymentMethod === "cod") {
    const configuredNumber = checkout.deliveryPaymentMethod === "bkash" ? paymentSettings.bkashNumber : paymentSettings.nagadNumber;
    if (!configuredNumber) throw new Error(`${checkout.deliveryPaymentMethod === "bkash" ? "bKash" : "Nagad"} number is not configured yet. Ask admin to add a payment number first.`);
  }
  const now = new Date().toISOString();
  const initialStatus = checkout.paymentMethod === "cod" ? "pending_payment" : "payment_submitted";
  const deliveryLocation = checkout.deliveryLocation || checkout.address || "";
  const selectedDeliveryCharge = deliveryChargeForLocation(product, deliveryLocation);
  const batch = await db.batch([
    { sql: `INSERT INTO store_orders (userId, productId, quantity, productName, productPrice, deliveryCharge, customerName, address, deliveryLocation, phone, paymentMethod, transactionId, senderNumber, deliveryPaymentMethod, status, createdAt, updatedAt)
            SELECT ?, id, ?, name, price, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            FROM store_products WHERE id = ? AND isActive != 0 AND stock >= ?`,
      args: [userId, checkout.quantity, selectedDeliveryCharge, checkout.customerName, checkout.address, deliveryLocation, checkout.phone, checkout.paymentMethod, checkout.transactionId || "", checkout.senderNumber || "", checkout.deliveryPaymentMethod || "", initialStatus, now, now, product.id, checkout.quantity] },
    { sql: "UPDATE store_products SET stock = stock - ?, updatedAt = ? WHERE id = ? AND stock >= ?", args: [checkout.quantity, now, product.id, checkout.quantity] }
  ]);
  if (Number(batch?.[0]?.rowsAffected || 0) < 1 || Number(batch?.[1]?.rowsAffected || 0) < 1) throw new Error("Not enough stock available.");
  return getOrderById(db, String(batch?.[0]?.lastInsertRowid || ""));
}

export async function createPrescriptionOrder(db, userId, input) {
  const now = new Date().toISOString();
  const medicine = input.medicineName ? `${input.medicineName} (Qty ${input.quantity})` : "Prescription upload";
  const productName = input.prescriptionText && !input.medicineName ? "Prescribed Medicine Request" : `Prescribed Medicine: ${medicine}`;
  const result = await db.execute({
    sql: `INSERT INTO store_orders (userId, productId, quantity, productName, productPrice, deliveryCharge, customerName, address, deliveryLocation, phone, paymentMethod, transactionId, senderNumber, deliveryPaymentMethod, status, orderType, prescriptionText, prescriptionFileUrl, createdAt, updatedAt)
          VALUES (?, 0, ?, ?, 0, 0, ?, ?, ?, ?, 'cod', '', '', '', 'pending', 'prescription', ?, ?, ?, ?)`,
    args: [userId, input.quantity || 1, productName, input.customerName, input.address, input.deliveryLocation || input.address || "", input.phone, input.prescriptionText || "", input.prescriptionFileUrl || "", now, now]
  });
  return getOrderById(db, String(result.lastInsertRowid));
}

export async function listOrders(db, userId = null) {
  const result = await db.execute({
    sql: userId
      ? "SELECT * FROM store_orders WHERE userId = ? ORDER BY createdAt DESC LIMIT 500"
      : `SELECT o.*, u.fullName AS userName, u.email AS userEmail, u.phone AS userPhone FROM store_orders o LEFT JOIN store_users u ON u.id = o.userId ORDER BY o.createdAt DESC LIMIT 1000`,
    args: userId ? [userId] : []
  });
  return result.rows.map(rowToOrder);
}

export async function getOrderById(db, id) {
  const result = await db.execute({
    sql: `SELECT o.*, u.fullName AS userName, u.email AS userEmail, u.phone AS userPhone
          FROM store_orders o
          LEFT JOIN store_users u ON u.id = o.userId
          WHERE o.id = ?
          LIMIT 1`,
    args: [id]
  });
  return rowToOrder(result.rows[0]);
}

export async function updateOrderStatus(db, id, status) {
  const nextStatus = cleanStatus(status);
  const current = await getOrderById(db, id);
  if (!current) return null;
  const now = new Date().toISOString();

  const isInventoryOrder = cleanOrderType(current.orderType || "product") === "product" && Number(current.productId) > 0;

  if (current.status !== "cancelled" && nextStatus === "cancelled") {
    if (isInventoryOrder) {
      await db.batch([
        { sql: "UPDATE store_orders SET status = ?, updatedAt = ? WHERE id = ?", args: [nextStatus, now, id] },
        { sql: "UPDATE store_products SET stock = stock + ?, updatedAt = ? WHERE id = ?", args: [current.quantity, now, current.productId] }
      ]);
    } else {
      await db.execute({ sql: "UPDATE store_orders SET status = ?, updatedAt = ? WHERE id = ?", args: [nextStatus, now, id] });
    }
    return getOrderById(db, id);
  }

  if (current.status === "cancelled" && nextStatus !== "cancelled") {
    if (isInventoryOrder) {
      const batch = await db.batch([
        { sql: "UPDATE store_products SET stock = stock - ?, updatedAt = ? WHERE id = ? AND stock >= ?", args: [current.quantity, now, current.productId, current.quantity] },
        { sql: "UPDATE store_orders SET status = ?, updatedAt = ? WHERE id = ?", args: [nextStatus, now, id] }
      ]);
      if (Number(batch?.[0]?.rowsAffected || 0) < 1) throw new Error("Not enough stock available to reactivate this order.");
    } else {
      await db.execute({ sql: "UPDATE store_orders SET status = ?, updatedAt = ? WHERE id = ?", args: [nextStatus, now, id] });
    }
    return getOrderById(db, id);
  }

  await db.execute({ sql: "UPDATE store_orders SET status = ?, updatedAt = ? WHERE id = ?", args: [nextStatus, now, id] });
  return getOrderById(db, id);
}

export async function updatePrescriptionOrderQuote(db, id, input = {}) {
  const current = await getOrderById(db, id);
  if (!current) return null;
  if (cleanOrderType(current.orderType || "product") !== "prescription") throw new Error("Only prescribed medicine orders can receive a custom price.");
  if (["delivered", "cancelled"].includes(cleanStatus(current.status))) throw new Error("Delivered or cancelled prescription orders cannot be repriced.");
  const now = new Date().toISOString();
  const nextStatus = current.status === "pending" ? "pending_payment" : current.status;
  await db.execute({
    sql: "UPDATE store_orders SET productPrice = ?, deliveryCharge = ?, status = ?, prescriptionQuotedAt = ?, updatedAt = ? WHERE id = ?",
    args: [input.productPrice, input.deliveryCharge, nextStatus, now, now, id]
  });
  return getOrderById(db, id);
}

export async function submitPrescriptionOrderPayment(db, userId, id, paymentInput = {}) {
  const current = await getOrderById(db, id);
  if (!current || String(current.userId) !== String(userId)) return null;
  if (cleanOrderType(current.orderType || "product") !== "prescription") throw new Error("Payment submission is only available for prescribed medicine orders here.");
  if (!(Number(current.productPrice || 0) > 0 || Number(current.deliveryCharge || 0) > 0 || current.prescriptionQuotedAt)) throw new Error("Admin has not added the prescribed medicine price yet.");
  const currentStatus = cleanStatus(current.status);
  if (currentStatus === "payment_submitted") throw new Error("Payment details were already submitted for this order.");
  if (currentStatus !== "pending_payment") throw new Error("Payment details can only be submitted while the order is pending payment.");

  const paymentSettings = await getPaymentSettings(db);
  if (paymentInput.paymentMethod === "bkash" || paymentInput.paymentMethod === "nagad") {
    const configuredNumber = paymentInput.paymentMethod === "bkash" ? paymentSettings.bkashNumber : paymentSettings.nagadNumber;
    if (!configuredNumber) throw new Error(`${paymentInput.paymentMethod === "bkash" ? "bKash" : "Nagad"} payment number is not configured yet. Please use Cash on Delivery.`);
  }
  if (paymentInput.paymentMethod === "bkash_nagad" && !paymentSettings.bkashNumber && !paymentSettings.nagadNumber) {
    throw new Error("bKash/Nagad payment number is not configured yet. Please use Cash on Delivery.");
  }
  if (paymentInput.paymentMethod === "cod") {
    const configuredNumber = paymentInput.deliveryPaymentMethod === "bkash" ? paymentSettings.bkashNumber : paymentSettings.nagadNumber;
    if (!configuredNumber) throw new Error(`${paymentInput.deliveryPaymentMethod === "bkash" ? "bKash" : "Nagad"} number is not configured yet. Ask admin to add a payment number first.`);
  }

  const now = new Date().toISOString();
  await db.execute({
    sql: "UPDATE store_orders SET paymentMethod = ?, deliveryPaymentMethod = ?, senderNumber = ?, transactionId = ?, status = 'payment_submitted', updatedAt = ? WHERE id = ? AND userId = ?",
    args: [paymentInput.paymentMethod, paymentInput.paymentMethod === "cod" ? paymentInput.deliveryPaymentMethod : "", paymentInput.senderNumber || "", paymentInput.transactionId || "", now, id, userId]
  });
  return getOrderById(db, id);
}

export async function deleteOrder(db, id) {
  const current = await getOrderById(db, id);
  if (!current) return 0;
  const now = new Date().toISOString();
  if (["pending", "pending_payment", "payment_submitted", "confirmed", "on_the_way"].includes(current.status) && cleanOrderType(current.orderType || "product") === "product" && Number(current.productId) > 0) {
    await db.execute({ sql: "UPDATE store_products SET stock = stock + ?, updatedAt = ? WHERE id = ?", args: [current.quantity, now, current.productId] });
  }
  const result = await db.execute({ sql: "DELETE FROM store_orders WHERE id = ?", args: [id] });
  return Number(result.rowsAffected || 0);
}

export async function cancelPendingOrderForUser(db, userId, id) {
  const current = await getOrderById(db, id);
  if (!current || String(current.userId) !== String(userId)) return null;
  if (!["pending", "pending_payment"].includes(current.status)) throw new Error("Only pending Cash on Delivery orders can be cancelled by the user.");
  return updateOrderStatus(db, id, "cancelled");
}

export async function listComments(db, productId = null, admin = false) {
  const result = await db.execute({
    sql: productId
      ? `SELECT c.*, p.name AS productName FROM store_comments c LEFT JOIN store_products p ON p.id = c.productId WHERE c.productId = ? ${admin ? "" : "AND c.isVisible != 0"} ORDER BY c.createdAt ASC LIMIT 500`
      : `SELECT c.*, p.name AS productName FROM store_comments c LEFT JOIN store_products p ON p.id = c.productId ORDER BY c.createdAt DESC LIMIT 1000`,
    args: productId ? [productId] : []
  });
  return result.rows.map(rowToComment);
}

export async function listUserReviews(db, userId) {
  const result = await db.execute({
    sql: `SELECT c.*, p.name AS productName
          FROM store_comments c LEFT JOIN store_products p ON p.id = c.productId
          WHERE c.userId = ? AND c.isReview = 1
          ORDER BY c.createdAt DESC LIMIT 500`,
    args: [userId]
  });
  return result.rows.map(rowToComment);
}

export async function getCommentById(db, id) {
  const result = await db.execute({ sql: `SELECT c.*, p.name AS productName FROM store_comments c LEFT JOIN store_products p ON p.id = c.productId WHERE c.id = ? LIMIT 1`, args: [id] });
  return rowToComment(result.rows[0]);
}

export async function hasDeliveredOrder(db, userId, productId) {
  const result = await db.execute({
    sql: "SELECT COUNT(*) AS total FROM store_orders WHERE userId = ? AND productId = ? AND status IN ('delivered', 'completed')",
    args: [userId, productId]
  });
  return Number(result.rows[0]?.total || 0) > 0;
}

export async function hasUserReviewedProduct(db, userId, productId) {
  const result = await db.execute({
    sql: "SELECT COUNT(*) AS total FROM store_comments WHERE userId = ? AND productId = ? AND isReview = 1",
    args: [userId, productId]
  });
  return Number(result.rows[0]?.total || 0) > 0;
}

export async function createComment(db, user, commentInput) {
  const product = await getProductById(db, commentInput.productId);
  if (!product) throw new Error("Product not found.");

  let parentId = commentInput.parentId || null;
  if (parentId) {
    const parent = await getCommentById(db, parentId);
    if (!parent || String(parent.productId) !== String(product.id)) throw new Error("Parent comment not found.");
  }

  if (commentInput.isReview) {
    if (!user) throw new Error("Please log in first.");
    const delivered = await hasDeliveredOrder(db, user.id, product.id);
    if (!delivered) throw new Error("You can review this product after your order is delivered.");
    const alreadyReviewed = await hasUserReviewedProduct(db, user.id, product.id);
    if (alreadyReviewed) throw new Error("You already reviewed this product.");
  }

  const now = new Date().toISOString();
  const commenterName = commentInput.isReview ? user.fullName : commentInput.userName;
  const result = await db.execute({
    sql: `INSERT INTO store_comments (productId, parentId, userId, userName, commenterType, isReview, rating, comment, adminReply, isVisible, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'user', ?, ?, ?, '', 1, ?, ?)`,
    args: [product.id, parentId, user?.id || null, commenterName, boolToInt(commentInput.isReview), commentInput.rating || 0, commentInput.comment, now, now]
  });
  return getCommentById(db, String(result.lastInsertRowid));
}

export async function createAdminCommentReply(db, parentId, replyText, isVisible = true) {
  const parent = await getCommentById(db, parentId);
  if (!parent) throw new Error("Comment not found.");
  const now = new Date().toISOString();
  const text = cleanText(replyText, 900);
  if (!text) throw new Error("Reply text is required.");
  const result = await db.execute({
    sql: `INSERT INTO store_comments (productId, parentId, userId, userName, commenterType, isReview, rating, comment, adminReply, isVisible, createdAt, updatedAt) VALUES (?, ?, NULL, 'Admin', 'admin', 0, 0, ?, '', ?, ?, ?)`,
    args: [parent.productId, parent.id, text, boolToInt(isVisible), now, now]
  });
  return getCommentById(db, String(result.lastInsertRowid));
}

export async function setCommentVisibility(db, id, isVisible = true) {
  await db.execute({ sql: "UPDATE store_comments SET isVisible = ?, updatedAt = ? WHERE id = ?", args: [boolToInt(isVisible), new Date().toISOString(), id] });
  return getCommentById(db, id);
}

export async function deleteComment(db, id) {
  const result = await db.execute({
    sql: `WITH RECURSIVE descendants(id) AS (
            SELECT id FROM store_comments WHERE id = ?
            UNION ALL
            SELECT c.id FROM store_comments c INNER JOIN descendants d ON c.parentId = d.id
          )
          DELETE FROM store_comments WHERE id IN (SELECT id FROM descendants)`,
    args: [id]
  });
  return Number(result.rowsAffected || 0);
}

export async function replyToComment(db, id, adminReply, isVisible = true) {
  return createAdminCommentReply(db, id, adminReply, isVisible);
}


export async function createUserEmailVerificationToken(db, userId, env = {}) {
  return createVerificationToken(db, userId, env);
}

export async function verifyUserEmailToken(db, token, env = {}) {
  return verifyEmailTokenInDb(db, token, env);
}
