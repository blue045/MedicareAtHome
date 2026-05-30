import { getDb } from "../../_lib/db.js";
import { getAdminSession } from "../../_lib/auth.js";
import { error, handleThrown, json, readJson } from "../../_lib/response.js";
import { normalizeSettings, toPublicSettings } from "../../_lib/validators.js";
import { createSettings, getSettings, updateSettings } from "../../_lib/turso.js";

const permissionFields = {
  content: ["siteName", "tagline", "description", "heroHighlight", "heroTitleLine", "primaryButtonText", "secondaryButtonText", "servicesButtonText", "contactButtonText", "stats", "navServicesLabel", "navStoreLabel", "navDoctorsLabel", "navAmbulanceLabel", "navHospitalLabel", "navBloodLabel", "navHowItWorksLabel", "navContactLabel", "servicesPageTitle", "servicesPageCopy", "storePageTitle", "storePageCopy", "doctorsPageTitle", "doctorsPageCopy", "ambulancePageTitle", "ambulancePageCopy", "hospitalPageTitle", "hospitalPageCopy", "bloodPageTitle", "bloodPageCopy", "howPageTitle", "howPageCopy", "contactPageTitle", "contactPageCopy", "loginPageTitle", "loginPageCopy", "signupPageTitle", "signupPageCopy", "profilePageTitle", "profilePageCopy", "pageContent"],
  services: ["serviceTags", "serviceIcons", "serviceDescriptions"],
  ambulance: ["ambulanceDescription", "ambulanceButtonText", "ambulancePhone", "ambulanceWhatsapp"],
  contact: ["location", "email", "instagramHandle", "facebookUrl", "socialLinks", "phones", "whatsapp", "emergencyNote"]
};

function requiredSettingsPermissions(body = {}) {
  const keys = new Set(Object.keys(body || {}));
  const required = [];
  for (const [permission, fields] of Object.entries(permissionFields)) {
    if (fields.some((field) => keys.has(field))) required.push(permission);
  }
  return required.length ? [...new Set(required)] : ["content"];
}

async function requireSettingsPermissions(request, env, body) {
  const session = await getAdminSession(request, env);
  if (!session) return error("Unauthorized", 401);
  if (session.isMaster) return null;
  const needed = requiredSettingsPermissions(body);
  const missing = needed.filter((permission) => !session.permissions.includes(permission));
  if (missing.length) return error("You do not have permission to edit this settings section.", 403);
  return null;
}

export async function onRequestGet({ env }) {
  try {
    const db = await getDb(env);
    const settings = await getSettings(db);
    return json({ settings: toPublicSettings(settings) }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestPatch({ request, env }) {
  try {
    const body = await readJson(request);
    const unauthorized = await requireSettingsPermissions(request, env, body);
    if (unauthorized) return unauthorized;

    const db = await getDb(env);
    const current = await getSettings(db);
    const result = normalizeSettings(body, current || {});
    if (!result.ok) return error(result.error, 400);

    if (current?.id) {
      const updated = await updateSettings(db, current.id, result.value);
      return json({ ok: true, settings: toPublicSettings(updated) });
    }

    const settings = await createSettings(db, { ...result.value, createdAt: new Date() });
    return json({ ok: true, settings: toPublicSettings(settings) }, { status: 201 });
  } catch (err) {
    return handleThrown(err);
  }
}
