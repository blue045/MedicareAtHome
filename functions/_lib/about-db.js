import { createClient } from "@libsql/client/web";

const clients = new Map();
const initialized = new Set();

function cleanEnv(value) {
  return String(value || "").trim().replace(/^[\'\"]|[\'\"]$/g, "");
}

function cleanText(value = "", max = 1000) {
  return String(value || "").trim().replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max);
}

function cleanImage(value = "") {
  const image = cleanText(value, 1500000);
  if (!image) return "";
  if (/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image)) return image;
  if (/^https?:\/\//i.test(image) || image.startsWith("/")) return cleanText(image, 1200);
  return "";
}

function boolToInt(value) { return value === false || value === 0 || value === "0" ? 0 : 1; }
function intToBool(value) { return !(value === false || value === 0 || value === "0"); }
function nowIso() { return new Date().toISOString(); }

export function getAboutDbStatus(env) {
  const url = cleanEnv(env.ABOUT_TURSO_DATABASE_URL || env.ABOUT_TURSO_URL || env.ABOUT_LIBSQL_URL);
  const authToken = cleanEnv(env.ABOUT_TURSO_AUTH_TOKEN || env.ABOUT_LIBSQL_AUTH_TOKEN);
  return { hasDatabaseUrl: Boolean(url), hasAuthToken: Boolean(authToken), urlLooksValid: Boolean(url && (url.startsWith("libsql://") || url.startsWith("https://") || url.startsWith("http://"))) };
}

function getAboutTursoConfig(env) {
  const url = cleanEnv(env.ABOUT_TURSO_DATABASE_URL || env.ABOUT_TURSO_URL || env.ABOUT_LIBSQL_URL);
  const authToken = cleanEnv(env.ABOUT_TURSO_AUTH_TOKEN || env.ABOUT_LIBSQL_AUTH_TOKEN);
  if (!url) throw new Error("Missing ABOUT_TURSO_DATABASE_URL. Create a third Turso DB for About data and add the URL in Cloudflare Pages environment variables.");
  if (!authToken) throw new Error("Missing ABOUT_TURSO_AUTH_TOKEN. Add the auth token for the About Turso DB.");
  return { url, authToken };
}

export async function getAboutDb(env) {
  const { url, authToken } = getAboutTursoConfig(env);
  const cacheKey = `${url}::${authToken.slice(0, 12)}`;
  let client = clients.get(cacheKey);
  if (!client) {
    client = createClient({ url, authToken });
    clients.set(cacheKey, client);
  }
  if (!initialized.has(cacheKey)) {
    await ensureAboutSchema(client);
    initialized.add(cacheKey);
  }
  return client;
}

async function ensureAboutSchema(db) {
  await db.execute(`CREATE TABLE IF NOT EXISTS about_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    description TEXT,
    photoUrl TEXT,
    sortOrder INTEGER DEFAULT 99,
    isPublished INTEGER DEFAULT 1,
    createdAt TEXT,
    updatedAt TEXT
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS about_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT,
    coverImage TEXT,
    author TEXT,
    isPublished INTEGER DEFAULT 1,
    createdAt TEXT,
    updatedAt TEXT
  )`);
  await db.execute("CREATE INDEX IF NOT EXISTS idx_about_profiles_pub_sort ON about_profiles (isPublished, sortOrder, createdAt)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_about_posts_pub_created ON about_posts (isPublished, createdAt)");
}

function rowToProfile(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    name: row.name || "",
    role: row.role || "",
    description: row.description || "",
    photoUrl: row.photoUrl || "",
    sortOrder: Number(row.sortOrder || 99),
    isPublished: intToBool(row.isPublished),
    createdAt: row.createdAt || "",
    updatedAt: row.updatedAt || ""
  };
}


function isRemovedAppointmentFlowText(value = "") {
  const text = String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  return text === "simple appointment flow"
    || text.includes("simple appointment flow")
    || text.includes("contact the team, confirm the patient details")
    || text.includes("then receive the requested home visit service");
}

function isRemovedAppointmentFlowItem(item = {}) {
  return [
    item.title,
    item.name,
    item.excerpt,
    item.content,
    item.description,
    item.bio
  ].some(isRemovedAppointmentFlowText);
}

function rowToPost(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    title: row.title || "",
    excerpt: row.excerpt || "",
    content: row.content || "",
    coverImage: row.coverImage || "",
    author: row.author || "",
    isPublished: intToBool(row.isPublished),
    createdAt: row.createdAt || "",
    updatedAt: row.updatedAt || ""
  };
}

function profileRecord(input = {}) {
  return {
    name: cleanText(input.name, 140),
    role: cleanText(input.role, 120),
    description: cleanText(input.description, 2000),
    photoUrl: cleanImage(input.photoUrl),
    sortOrder: Number(input.sortOrder || 99),
    isPublished: boolToInt(input.isPublished !== false),
    createdAt: input.createdAt || nowIso(),
    updatedAt: nowIso()
  };
}

function postRecord(input = {}) {
  return {
    title: cleanText(input.title, 180),
    excerpt: cleanText(input.excerpt, 500),
    content: cleanText(input.content, 12000),
    coverImage: cleanImage(input.coverImage),
    author: cleanText(input.author, 120),
    isPublished: boolToInt(input.isPublished !== false),
    createdAt: input.createdAt || nowIso(),
    updatedAt: nowIso()
  };
}

async function insertRecord(db, table, record) {
  const columns = Object.keys(record);
  const placeholders = columns.map(() => "?").join(", ");
  const args = columns.map((column) => record[column]);
  const result = await db.execute({ sql: `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`, args });
  return String(result.lastInsertRowid || "");
}

async function updateRecord(db, table, id, record) {
  const columns = Object.keys(record).filter((column) => column !== "createdAt");
  const setters = columns.map((column) => `${column} = ?`).join(", ");
  const args = [...columns.map((column) => record[column]), String(id || "")];
  await db.execute({ sql: `UPDATE ${table} SET ${setters} WHERE id = ?`, args });
}

export async function listAbout(db, includeDrafts = false) {
  const profileSql = includeDrafts ? "SELECT * FROM about_profiles ORDER BY sortOrder ASC, createdAt DESC LIMIT 100" : "SELECT * FROM about_profiles WHERE isPublished != 0 ORDER BY sortOrder ASC, createdAt DESC LIMIT 100";
  const postSql = includeDrafts ? "SELECT * FROM about_posts ORDER BY createdAt DESC LIMIT 100" : "SELECT * FROM about_posts WHERE isPublished != 0 ORDER BY createdAt DESC LIMIT 100";
  const [profiles, posts] = await Promise.all([db.execute(profileSql), db.execute(postSql)]);
  const mappedProfiles = profiles.rows.map(rowToProfile);
  const mappedPosts = posts.rows.map(rowToPost);

  // Hide the old default About card from the public About section.
  // Admin views still receive it with includeDrafts=true so it can be edited or deleted from the panel.
  if (includeDrafts) return { profiles: mappedProfiles, posts: mappedPosts };

  return {
    profiles: mappedProfiles.filter((profile) => !isRemovedAppointmentFlowItem(profile)),
    posts: mappedPosts.filter((post) => !isRemovedAppointmentFlowItem(post))
  };
}

export async function createAboutProfile(db, input) {
  const record = profileRecord(input);
  if (!record.name) throw new Error("Team member name is required.");
  const id = await insertRecord(db, "about_profiles", record);
  const result = await db.execute({ sql: "SELECT * FROM about_profiles WHERE id = ? LIMIT 1", args: [id] });
  return rowToProfile(result.rows[0]);
}

export async function updateAboutProfile(db, id, input) {
  const record = profileRecord(input);
  if (!record.name) throw new Error("Team member name is required.");
  await updateRecord(db, "about_profiles", id, record);
  const result = await db.execute({ sql: "SELECT * FROM about_profiles WHERE id = ? LIMIT 1", args: [String(id || "")] });
  return rowToProfile(result.rows[0]);
}

export async function deleteAboutProfile(db, id) {
  const result = await db.execute({ sql: "DELETE FROM about_profiles WHERE id = ?", args: [String(id || "")] });
  return Number(result.rowsAffected || 0);
}

export async function createAboutPost(db, input) {
  const record = postRecord(input);
  if (!record.title) throw new Error("Blog title is required.");
  const id = await insertRecord(db, "about_posts", record);
  const result = await db.execute({ sql: "SELECT * FROM about_posts WHERE id = ? LIMIT 1", args: [id] });
  return rowToPost(result.rows[0]);
}

export async function updateAboutPost(db, id, input) {
  const record = postRecord(input);
  if (!record.title) throw new Error("Blog title is required.");
  await updateRecord(db, "about_posts", id, record);
  const result = await db.execute({ sql: "SELECT * FROM about_posts WHERE id = ? LIMIT 1", args: [String(id || "")] });
  return rowToPost(result.rows[0]);
}

export async function deleteAboutPost(db, id) {
  const result = await db.execute({ sql: "DELETE FROM about_posts WHERE id = ?", args: [String(id || "")] });
  return Number(result.rowsAffected || 0);
}
